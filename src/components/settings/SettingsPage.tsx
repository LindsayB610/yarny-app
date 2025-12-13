import { AutoStoriesOutlined, EditNoteOutlined } from "@mui/icons-material";
import { Box, Button, Container, Stack, Tab, Tabs, Typography } from "@mui/material";
import type { JSX, SyntheticEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { StorageSettingsSection } from "./StorageSettingsSection";

type SettingsTab = {
  label: string;
  value: string;
  path: string;
};

type NavigationLink = {
  label: string;
  path: string;
  icon: typeof AutoStoriesOutlined;
};

const SETTINGS_TABS = [
  {
    label: "Storage",
    value: "storage",
    path: "/settings/storage"
  }
] satisfies readonly SettingsTab[];

const NAVIGATION_LINKS = [
  {
    label: "Stories",
    path: "/stories",
    icon: AutoStoriesOutlined
  },
  {
    label: "Open Editor",
    path: "/editor",
    icon: EditNoteOutlined
  }
] satisfies readonly NavigationLink[];

export function SettingsPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab =
    SETTINGS_TABS.find((tab) => location.pathname.includes(tab.path))?.value ?? "storage";

  const handleTabChange = (_event: SyntheticEvent, value: string) => {
    const targetTab = SETTINGS_TABS.find((tab) => tab.value === value);
    if (targetTab) {
      void navigate(targetTab.path);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, hsla(160, 84%, 39%, 1) 0%, hsla(180, 94%, 31%, 1) 100%)",
        py: { xs: 6, md: 10 },
        px: { xs: 2, md: 3 }
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            background: "linear-gradient(135deg, rgba(17, 24, 39, 0.92) 0%, rgba(30, 41, 59, 0.96) 100%)",
            borderRadius: 4,
            border: "1px solid rgba(148, 163, 184, 0.25)",
            boxShadow: "0px 30px 70px rgba(15, 23, 42, 0.5)",
            p: { xs: 4, md: 6 },
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={{ xs: 3, md: 4 }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Stack spacing={1}>
              <Typography variant="h3" sx={{ color: "primary.light", fontWeight: 800 }}>
                Settings
              </Typography>
              <Typography variant="body1" sx={{ color: "rgba(226, 232, 240, 0.8)" }}>
                Manage storage and backup preferences for Yarny React.
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ width: { xs: "100%", sm: "auto" } }}
            >
              {NAVIGATION_LINKS.map(({ label, path, icon: Icon }) => (
                <Button
                  key={path}
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    void navigate(path);
                  }}
                  startIcon={<Icon fontSize="small" />}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: "9999px",
                    px: 3,
                    py: 1.1,
                    boxShadow: "0 14px 35px rgba(94, 234, 212, 0.25)"
                  }}
                >
                  {label}
                </Button>
              ))}
            </Stack>
          </Stack>

          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="Yarny settings tabs"
            TabIndicatorProps={{ sx: { display: "none" } }}
            sx={{
              alignSelf: { xs: "stretch", sm: "flex-start" },
              bgcolor: "rgba(15, 23, 42, 0.65)",
              borderRadius: "9999px",
              overflow: "hidden",
              p: 0.75,
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                color: "rgba(148, 163, 184, 0.85)",
                borderRadius: "9999px",
                minHeight: 48,
                px: 3
              },
              "& .MuiTab-root.Mui-selected": {
                bgcolor: "primary.main",
                color: "primary.contrastText",
                boxShadow: "0 10px 25px rgba(16, 185, 129, 0.45)"
              }
            }}
          >
            {SETTINGS_TABS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>

          <StorageSettingsSection />
        </Box>
      </Container>
    </Box>
  );
}

