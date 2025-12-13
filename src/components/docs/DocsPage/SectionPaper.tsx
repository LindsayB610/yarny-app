import { Divider, Paper, Typography, useTheme } from "@mui/material";
import type { JSX } from "react";

interface SectionPaperProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export function SectionPaper({ id, title, children }: SectionPaperProps): JSX.Element {
  const theme = useTheme();
  return (
    <Paper
      id={id}
      elevation={8}
      sx={{
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        backgroundImage:
          "linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)",
        color: theme.palette.text.primary,
        borderRadius: 4,
        border: "1px solid rgba(148, 163, 184, 0.22)",
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
        p: { xs: 3, md: 4 },
        mb: { xs: 4, md: 6 },
        scrollMarginTop: { xs: 96, md: 120 }
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          fontWeight: 700,
          color: "primary.main"
        }}
      >
        {title}
      </Typography>
      <Divider
        sx={{
          borderColor: "rgba(148, 163, 184, 0.3)",
          mb: 3
        }}
      />
      {children}
    </Paper>
  );
}

