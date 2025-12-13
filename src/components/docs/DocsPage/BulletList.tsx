import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme
} from "@mui/material";
import type { JSX } from "react";

interface BulletListProps {
  items: Array<string | JSX.Element>;
}

export function BulletList({ items }: BulletListProps): JSX.Element {
  const theme = useTheme();

  return (
    <List
      dense
      sx={{
        color: theme.palette.text.secondary,
        "& .MuiListItemButton-root": {
          borderRadius: 2
        }
      }}
    >
      {items.map((item, index) => (
        <ListItemButton
          key={index}
          disableGutters
          sx={{
            alignItems: "flex-start",
            py: 1,
            px: 0
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 32,
              mt: "4px",
              color: theme.palette.primary.main
            }}
          >
            <CheckCircleOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              variant: "body1",
              sx: { color: "inherit" }
            }}
            primary={item}
          />
        </ListItemButton>
      ))}
    </List>
  );
}

