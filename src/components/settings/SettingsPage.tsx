import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import type { JSX, SyntheticEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { StorageSettingsSection } from "./StorageSettingsSection";

const SETTINGS_TABS = [
  {
    label: "Storage",
    value: "storage",
    path: "/settings/storage"
  }
] as const;

export function SettingsPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab =
    SETTINGS_TABS.find((tab) => location.pathname.includes(tab.path))?.value ?? "storage";

  const handleTabChange = (_event: SyntheticEvent, value: string) => {
    const targetTab = SETTINGS_TABS.find((tab) => tab.value === value);
    if (targetTab) {
      navigate(targetTab.path);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box display="flex" flexDirection="column" gap={3}>
        <Box display="flex" flexDirection="column" gap={0.5}>
          <Typography variant="h4" fontWeight={700}>
            Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage storage and backup preferences for Yarny React.
          </Typography>
        </Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="Yarny settings tabs"
          textColor="primary"
          indicatorColor="primary"
        >
          {SETTINGS_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>

        <StorageSettingsSection />
      </Box>
    </Container>
  );
}


