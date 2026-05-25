'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { Box, TextField } from '@mui/material';

interface OTPInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export default function OTPInput({
  length = 6,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  error = false,
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (value.length === 0) {
      setOtp(Array(length).fill(''));
    }
  }, [value, length]);

  const handleChange = (index: number, inputValue: string) => {
    if (!/^\d*$/.test(inputValue)) return;

    const newOtp = [...otp];
    newOtp[index] = inputValue.slice(-1);
    setOtp(newOtp);

    onChange?.(newOtp.join(''));

    if (inputValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== '') && newOtp.join('').length === length) {
      onComplete?.(newOtp.join(''));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();

    if (/^\d+$/.test(pastedData)) {
      const digits = pastedData.slice(0, length).split('');
      const newOtp = [...Array(length).fill('')];
      digits.forEach((d, i) => {
        if (i < length) newOtp[i] = d;
      });
      setOtp(newOtp);
      onChange?.(newOtp.join(''));
      onComplete?.(newOtp.join(''));
      inputRefs.current[Math.min(digits.length, length - 1)]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        gap: { xs: 0.75, sm: 1.5 },
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        flexWrap: 'nowrap',
      }}
    >
      {otp.map((digit, index) => (
        <TextField
          key={index}
          inputRef={(el) => {
            inputRefs.current[index] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          error={error}
          slotProps={{
            htmlInput: {
              maxLength: 1,
              inputMode: 'numeric',
              style: {
                textAlign: 'center',
                fontWeight: 500,
                fontSize: 'clamp(18px, 4vw, 24px)',
                padding: 0,
                height: '100%',
              },
            },
          }}
          sx={{
            width: { xs: 40, sm: 48 },
            minWidth: { xs: 40, sm: 48 },
            height: { xs: 48, sm: 56 },
            flexShrink: 0,
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              height: '100%',
              '& fieldset': {
                borderWidth: 2,
                borderColor: error ? 'error.main' : 'divider',
              },
              '&:hover fieldset': {
                borderColor: error ? 'error.main' : 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderWidth: 3,
                borderColor: error ? 'error.main' : 'primary.main',
              },
            },
          }}
        />
      ))}
    </Box>
  );
}
