import type { Decorator, Preview } from "@storybook/react-vite";
import "../../web/app/globals.css";

const withTheme: Decorator = (Story, context) => (
  <div
    className={context.globals.theme === "dark" ? "dark" : ""}
    style={{ background: "var(--page)", color: "var(--ink)", padding: "1rem" }}
  >
    <Story />
  </div>
);

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Tema",
      toolbar: {
        title: "Tema",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Claro" },
          { value: "dark", title: "Escuro" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: {
    layout: "fullscreen",
    viewport: {
      options: {
        mobile: {
          name: "Mobile",
          styles: { width: "375px", height: "800px" },
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1280px", height: "800px" },
        },
      },
    },
  },
};

export default preview;
