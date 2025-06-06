import { useEffect, useState } from "react";
import { applyTheme } from "@cloudscape-design/components/theming";
import {
  ThemeProvider,
  defaultDarkModeOverride,
} from "@aws-amplify/ui-react";
import App from "../app";
import { Amplify, Auth } from "aws-amplify";
import { AppConfig } from "../common/types";
import { AppContext } from "../common/app-context";
import { Alert, StatusIndicator } from "@cloudscape-design/components";
import { StorageHelper } from "../common/helpers/storage-helper";
import { Mode } from "@cloudscape-design/global-styles";
import "@aws-amplify/ui-react/styles.css";
export default function AppConfigured() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState<boolean | null>(null);
  const [authenticated, setAuthenticated] = useState<boolean>(null);
  const [theme, setTheme] = useState(StorageHelper.getTheme());
  const [configured, setConfigured] = useState<boolean>(false);
  // trigger authentication state when needed

  useEffect(() => { // this might be an issue
    const removeTextareas = () => {
      // the random useless textarea that's rendered
        const textarea = document.querySelector(
          'textarea[aria-hidden="true"][tabindex="-1"][style*="visibility: hidden"][style*="position: absolute"]'
        );
      
        if (textarea) {
          textarea.remove();
        }
    };
    removeTextareas();
  
    const observer = new MutationObserver((mutationsList) => {
      mutationsList.forEach((mutation) => {
        if (mutation.type === 'childList') {
          removeTextareas();
        }
      });
    });
  
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    (async () => {
      let currentConfig: AppConfig;
      try {
        const result = await fetch("/aws-exports.json");
        const awsExports = await result.json();
        currentConfig = Amplify.configure(awsExports) as AppConfig | null;
        const user = await Auth.currentAuthenticatedUser();
        if (user) {
          setAuthenticated(true);
        }
        setConfig(awsExports);
        setConfigured(true);
      } catch (e) {
        // If you get to this state, then this means the user check failed
        // technically it is possible that loading aws-exports.json failed too or some other step
        // but that is very unlikely
        console.error("Authentication check error:", e);
        try {
          if (currentConfig.federatedSignInProvider != "") {
            Auth.federatedSignIn({ customProvider: currentConfig.federatedSignInProvider });
          } else {
            Auth.federatedSignIn();
          }
        } catch (error) {
          // however, just in case, we'll add another try catch
          setError(true);
        }
      }
    })();
  }, []);
  // whenever the authentication state changes, if it's changed to un-authenticated, re-verify
  useEffect(() => {
    if (!authenticated && configured) {
      console.log("No authenticated user, initiating sign-in.");
      if (config.federatedSignInProvider != "") {
        Auth.federatedSignIn({ customProvider: config.federatedSignInProvider });
      } else {
        Auth.federatedSignIn();
      }
    }
  }, [authenticated, configured]);
  // dark/light theme
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style"
        ) {
          const newValue =
            document.documentElement.style.getPropertyValue(
              "--app-color-scheme"
            );
          const mode = newValue === "dark" ? Mode.Dark : Mode.Light;
          if (mode !== theme) {
            setTheme(mode);
          }
        }
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
    return () => {
      observer.disconnect();
    };
  }, [theme]);
  // display a loading screen while waiting for the config file to load
  if (!config) {
    if (error) {
      return (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Alert header="Configuration error" type="error">
            Error loading configuration from "
            <a href="/aws-exports.json" style={{ fontWeight: "600" }}>
              /aws-exports.json
            </a>
            "
          </Alert>
        </div>
      );
    }
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusIndicator type="loading">Loading</StatusIndicator>
      </div>
    );
  }
  
    // Dynamically add Google fonts link to the document head.
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);

  applyTheme({
    theme: {
      tokens: {
        // Background Colors
        colorBackgroundLayoutMain: {
          light: 'white',
//          dark: '#2a2a2a',
        },
        colorBackgroundContainerContent: {
          light: '#f7f8f9',
//          dark: '#333333',
        },

        // Primary Button Styling
        colorTextButtonPrimaryDefault: {
          light: '#ffffff',
          dark: '#ffffff', // Ensure white text in dark mode for maximum readability
        },
        colorBackgroundButtonPrimaryDefault: {
          light: '#0055a5', // Mayflower's primary blue color for buttons
          dark: '#0E3C64', // 30% Bay Blue shade for dark mode accessibility
        },
        colorBackgroundButtonPrimaryHover: {
          light: '#004080', // darker blue for hover effect
          dark: '#1A4F7A', // Lighter hover state in dark mode for better contrast
        },
        colorBackgroundButtonPrimaryActive: {
          light: '#003C61', // Active state for primary button in light mode
          dark: '#0A2F4A', // Darker active state for dark mode
        },

        // Secondary/Normal Button Styling for dark mode accessibility
        colorTextButtonNormalDefault: {
          light: '#0055a5',
          dark: '#ffffff', // White text for better contrast in dark mode
        },
        colorBackgroundButtonNormalDefault: {
          light: 'transparent',
          dark: 'transparent',
        },
        colorBorderButtonNormalDefault: {
          light: '#0055a5',
          dark: '#0E3C64', // Use consistent blue in dark mode
        },
        colorBackgroundButtonNormalHover: {
          light: '#f2f3f3',
          dark: 'rgba(14, 60, 100, 0.2)', // Subtle blue tint for hover in dark mode
        },

        // Link Button Styling for dark mode accessibility
        colorTextLinkButtonNormalDefault: {
          light: '#0055a5',
          dark: '#4DA6DA', // Lighter blue for better contrast in dark mode
        },

        // Focus indicator styling for accessibility
        colorBorderItemFocused: {
          light: '#0972d3',
          dark: '#4DA6DA', // Lighter blue for focus indicator in dark mode
        },

        borderRadiusButton: '4px', // slightly rounded corners for Mayflower style

        // Border Colors
        colorBorderInputDefault: {
          light: '#d9d9d9',
//          dark: '#4a4a4a',
        },
        colorBorderControlDefault: {
          light: '#e1e1e1',
//          dark: '#4a4a4a',
        },
        colorBorderDividerDefault: {
          light: '#e1e1e1',
//          dark: '#4a4a4a',
        },
        
        // Text Colors
        colorTextBodyDefault: {
          light: '#333333',
//          dark: '#eaeaea',
        },
        colorTextHeadingDefault: {
          light: '#1a1a1a',
//          dark: '#ffffff',
        },
        colorTextLinkDefault: {
          light: '#0055a5',
//            dark: '#66b3ff',
        },

        // Font settings
        fontFamilyBase: "'Noto Sans', sans-serif", // Using Noto Sans for consistency with Mayflower
        fontSizeBodyM: '16px',
        fontSizeBodyS: '16px',
        fontSizeHeadingM: '24px',
        fontSizeHeadingL: '32px',

        // Spacing adjustments
//      spaceScaledM: '16px',
//      spaceScaledL: '24px',
      },
    },
  });

  // the main app - only display it when authenticated
  return (
    <AppContext.Provider value={config}>
      <ThemeProvider
        theme={{
          name: "default-theme",
          overrides: [defaultDarkModeOverride],
        }}
        colorMode={theme === Mode.Dark ? "dark" : "light"}
      >
        {authenticated ? (
          <App />
        ) : (
          // <TextContent>Are we authenticated: {authenticated}</TextContent>
          <></>
        )}
      </ThemeProvider>
    </AppContext.Provider>
  );
}