import { join } from 'path';
import { Theme, buildThemedComponents } from '@cloudscape-design/components-themeable/theming';
const theme = {
   tokens: {
      // Values are applied globally, except for visual contexts
      colorBackgroundLayoutMain: {
          // Specify value for light and dark mode
          light: 'white',
          dark: 'blue'
      },
      // Shorter syntax to apply the same value for both light and dark mode
      colorTextAccent: '#0073bb',
   },
   contexts: {
      // Values for visual contexts. Unless specified, default values will be applied
      'top-navigation': {
         tokens: {
            colorTextAccent: '#44b9d6',
         },
}}};

buildThemedComponents({ theme, outputDir: join(process.cwd(), './themed') });