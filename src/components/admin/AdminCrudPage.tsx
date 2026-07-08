import { ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef, GridValidRowModel, GridToolbar } from '@mui/x-data-grid';

interface AdminCrudPageProps<T extends GridValidRowModel> {
  title: string;
  description?: string;
  extraActions?: ReactNode;
  primaryActionLabel?: string;
  primaryActionIcon?: ReactNode;
  onPrimaryAction?: () => void;
  
  error?: string;
  success?: string;
  onErrorClose?: () => void;
  onSuccessClose?: () => void;
  
  loading: boolean;
  rows: T[];
  columns: GridColDef[];
  getRowId?: (row: T) => any;
  
  dialogOpen: boolean;
  onDialogClose: () => void;
  dialogTitle: string;
  saving: boolean;
  onSave: () => void;
  renderForm: ReactNode;
}

export function AdminCrudPage<T extends GridValidRowModel>({
  title,
  description,
  extraActions,
  primaryActionLabel,
  primaryActionIcon,
  onPrimaryAction,
  
  error,
  success,
  onErrorClose,
  onSuccessClose,
  
  loading,
  rows,
  columns,
  getRowId,
  
  dialogOpen,
  onDialogClose,
  dialogTitle,
  saving,
  onSave,
  renderForm,
}: AdminCrudPageProps<T>) {
  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>{title}</Typography>
          {description && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {description}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          {extraActions}
          {onPrimaryAction && primaryActionLabel && (
            <Button variant="contained" startIcon={primaryActionIcon} onClick={onPrimaryAction}>
              {primaryActionLabel}
            </Button>
          )}
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={onErrorClose}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={onSuccessClose}>{success}</Alert>}

      <Box sx={{ height: 600, width: '100%', '& .MuiDataGrid-root': { border: '1px solid', borderColor: 'divider', borderRadius: 2 } }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={getRowId}
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
            },
          }}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 25, page: 0 },
            },
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          sx={{
            bgcolor: 'background.paper',
          }}
        />
      </Box>

      <Dialog open={dialogOpen} onClose={onDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent dividers>
          {renderForm}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 2 }}>
          <Button onClick={onDialogClose} disabled={saving}>İptal</Button>
          <Button onClick={onSave} variant="contained" disabled={saving}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
