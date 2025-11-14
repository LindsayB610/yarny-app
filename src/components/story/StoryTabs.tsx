import { Tab, Tabs, Box } from "@mui/material";
import { type JSX, useEffect, useMemo, useState, type SyntheticEvent } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: JSX.Element;
}

interface StoryTabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  value?: string;
  onChange?: (tabId: string) => void;
  renderActions?: (activeTabId: string) => JSX.Element | null;
}

export function StoryTabs({
  tabs,
  defaultTab,
  value,
  onChange,
  renderActions
}: StoryTabsProps): JSX.Element {
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id || "");
  const isControlled = typeof value === "string";
  const activeTab = isControlled ? (value ?? "") : internalTab;

  useEffect(() => {
    if (!isControlled) {
      const nextDefault = defaultTab || tabs[0]?.id || "";
      if (nextDefault && !tabs.some((tab) => tab.id === internalTab)) {
        setInternalTab(nextDefault);
      }
    }
  }, [defaultTab, internalTab, isControlled, tabs]);

  const handleChange = (_event: SyntheticEvent, newValue: string) => {
    if (!isControlled) {
      setInternalTab(newValue);
    }
    onChange?.(newValue);
  };

  const activeTabContent = useMemo(
    () => tabs.find((tab) => tab.id === activeTab)?.content,
    [activeTab, tabs]
  );

  const actions = renderActions?.(activeTab);

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1
        }}
      >
        <Tabs
          value={activeTab}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            flex: 1,
            minWidth: 0, // Allow tabs to shrink
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": {
              color: "rgba(255, 255, 255, 0.7)",
              minWidth: 0,
              padding: "12px 16px",
              fontSize: "0.875rem",
              textTransform: "none",
              "&.Mui-selected": {
                color: "primary.main"
              }
            },
            "& .MuiTabs-indicator": {
              bgcolor: "primary.main"
            },
            "& .MuiTabs-scrollButtons": {
              width: 32
            }
          }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.id} label={tab.label} value={tab.id} />
          ))}
        </Tabs>
        {actions ? <Box sx={{ display: "flex", alignItems: "center" }}>{actions}</Box> : null}
      </Box>
      <Box sx={{ mt: 2 }}>{activeTabContent}</Box>
    </Box>
  );
}

