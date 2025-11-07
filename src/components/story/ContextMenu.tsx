import { Menu, MenuItem, type MenuProps } from "@mui/material";
import { type JSX } from "react";

export interface ContextMenuAction {
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  actions: ContextMenuAction[];
}

export function ContextMenu({
  open,
  anchorEl,
  onClose,
  actions
}: ContextMenuProps): JSX.Element {
  return (
    <Menu
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right"
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right"
      }}
      PaperProps={{
        sx: {
          bgcolor: "rgba(31, 41, 55, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          "& .MuiMenuItem-root": {
            color: "rgba(255, 255, 255, 0.9)",
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.1)"
            },
            "&.Mui-disabled": {
              color: "rgba(255, 255, 255, 0.3)"
            }
          }
        }
      }}
    >
      {actions.map((action, index) => (
        <MenuItem
          key={index}
          onClick={() => {
            action.onClick();
            onClose();
          }}
          disabled={action.disabled}
        >
          {action.icon && (
            <span style={{ marginRight: 8, fontSize: 18 }}>{action.icon}</span>
          )}
          {action.label}
        </MenuItem>
      ))}
    </Menu>
  );
}

