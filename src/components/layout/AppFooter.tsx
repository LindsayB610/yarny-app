import { Box, Container, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

type FooterVariant = "auto" | "dark" | "light";

type FooterLink =
  | {
      label: string;
      to: string;
    }
  | {
      label: string;
      href: string;
    };

const FOOTER_LINKS: FooterLink[] = [
  { label: "User Guide", to: "/docs" },
  { label: "Migration Plan", href: "/migration-plan.html" },
  { label: "Testing Workbook", href: "/migration-plan/testing-workbook.html" }
];

export function AppFooter({ variant = "auto" }: { variant?: FooterVariant }): JSX.Element {
  const currentYear = new Date().getFullYear();

  const resolvedVariant: Exclude<FooterVariant, "auto"> =
    variant === "auto"
      ? typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
        ? "dark"
        : "light"
      : variant;

  const palette = resolvedVariant === "dark"
    ? {
        background: "rgba(15, 23, 42, 0.9)",
        border: "rgba(148, 163, 184, 0.25)",
        primary: "rgba(34, 211, 238, 0.9)",
        primaryHover: "rgba(165, 243, 252, 0.95)",
        text: "rgba(226, 232, 240, 0.78)"
      }
    : {
        background: "rgba(241, 245, 249, 0.9)",
        border: "rgba(148, 163, 184, 0.35)",
        primary: "rgba(15, 118, 110, 0.9)",
        primaryHover: "rgba(13, 148, 136, 1)",
        text: "rgba(30, 41, 59, 0.78)"
      };

  return (
    <Box
      component="footer"
      sx={{
        mt: "auto",
        borderTop: `1px solid ${palette.border}`,
        backgroundColor: palette.background,
        backdropFilter: "blur(10px)"
      }}
    >
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="body2" sx={{ color: palette.text, textAlign: "center" }}>
            © {currentYear} Yarny. Your personal writing tool.
          </Typography>
          <Stack direction="row" spacing={3}>
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.label}
                component={"to" in link ? RouterLink : "a"}
                to={"to" in link ? link.to : undefined}
                href={"href" in link ? link.href : undefined}
                underline="hover"
                sx={{
                  color: palette.primary,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  transition: "color 0.2s ease",
                  "&:hover": {
                    color: palette.primaryHover
                  }
                }}
              >
                {link.label}
              </Link>
            ))}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}


