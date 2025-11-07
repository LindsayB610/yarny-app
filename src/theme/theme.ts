import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    brand: Palette["primary"];
  }

  interface PaletteOptions {
    brand?: PaletteOptions["primary"];
  }
}

const palette = {
  mode: "light" as const,
  primary: {
    main: "#6D4AFF",
    light: "#A491FF",
    dark: "#4B2DB3",
    contrastText: "#FFFFFF"
  },
  secondary: {
    main: "#FF6F59",
    light: "#FF9988",
    dark: "#B74C3D",
    contrastText: "#0B0B0F"
  },
  background: {
    default: "#F5F6FA",
    paper: "#FFFFFF"
  },
  text: {
    primary: "#1F2933",
    secondary: "#52606D"
  }
};

export const theme = createTheme({
  palette: {
    ...palette,
    brand: palette.primary
  },
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily:
      '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: "2.75rem",
      fontWeight: 700
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 700
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 600
    },
    subtitle1: {
      fontSize: "1rem",
      fontWeight: 600
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.6
    }
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true
      },
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: "none",
          "&:focus-visible": {
            outline: `2px solid ${palette.primary.main}`,
            outlineOffset: "2px"
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        colorPrimary: {
          backgroundColor: palette.background.default,
          color: palette.text.primary
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow:
            "0 10px 30px rgba(125, 137, 175, 0.12), 0 2px 6px rgba(125, 137, 175, 0.08)"
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10
        }
      }
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.background.default,
          color: palette.text.primary
        }
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          "&:focus-visible": {
            outline: `2px solid ${palette.primary.main}`,
            outlineOffset: "2px"
          }
        }
      }
    },
    MuiLink: {
      styleOverrides: {
        root: {
          "&:focus-visible": {
            outline: `2px solid ${palette.primary.main}`,
            outlineOffset: "2px",
            borderRadius: "4px"
          }
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "&:focus-within": {
              outline: `2px solid ${palette.primary.main}`,
              outlineOffset: "2px"
            }
          }
        }
      }
    }
  }
});

export type AppTheme = typeof theme;

