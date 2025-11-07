import { Tab, Tabs, Box } from "@mui/material";
import { type JSX, useState, type SyntheticEvent } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: JSX.Element;
}

interface StoryTabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export function StoryTabs({
  tabs,
  defaultTab,
  onChange
}: StoryTabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || "");

  const handleChange = (_event: SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    onChange?.(newValue);
  };

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <Box sx={{ width: "100%" }}>
      <Tabs
        value={activeTab}
        onChange={handleChange}
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": {
            color: "rgba(255, 255, 255, 0.7)",
            "&.Mui-selected": {
              color: "primary.main"
            }
          },
          "& .MuiTabs-indicator": {
            bgcolor: "primary.main"
          }
        }}
      >
        {tabs.map((tab) => (
          <Tab key={tab.id} label={tab.label} value={tab.id} />
        ))}
      </Tabs>
      <Box sx={{ mt: 2 }}>{activeTabContent}</Box>
    </Box>
  );
}

