# Project Summary

## Overview

This project is a web-based design studio for Grandview Fence products. It allows users to visualize different fence and gate styles in various scenes.

## Architecture

The application is a single-page application (SPA) built with vanilla JavaScript, HTML, and CSS. It uses the `three.js` library for 2D and 3D rendering.

The application is divided into two main components:

1.  **Main Application (`app.js`):** This is the entry point of the application. It handles the main UI, state management, and the 2D fence renderer.
2.  **Gate Tool (`gate_tool/`):** This is a 3D gate renderer that runs in an `iframe`. It is a legacy component with obfuscated code, and it uses an older version of `three.js`.

The main application and the gate tool communicate using the `postMessage` API.

## Data

The application's data, including the available scenes, styles, and asset paths, is defined in the `catalog.json` file.

## Key Files

*   `index.html`: The main HTML file for the application.
*   `app.js`: The main JavaScript file for the application.
*   `styles.css`: The main stylesheet for the application.
*   `catalog.json`: The data file for the application.
*   `gate_tool/index.html`: The HTML file for the gate tool `iframe`.
*   `gate_tool/js/ultra_dsg_min.js`: The obfuscated JavaScript file for the gate tool.

## Running the Application

To run the application, you need to serve the project root directory from a local web server. A PowerShell script (`serve.ps1`) and a shell script (`scripts/start-server.sh`) are provided for this purpose.

## Known Issues

*   **Gate Tool Legacy Code:** The gate tool is a legacy component with obfuscated code. This makes it difficult to maintain and debug.
*   **Outdated `three.js`:** The gate tool uses an outdated version of `three.js` (r86). This should be updated in the future.

## Future Improvements

*   **Update `three.js`:** The `three.js` library should be updated to a more recent version.
*   **De-obfuscate the Gate Tool:** The `ultra_dsg_min.js` file should be de-obfuscated to make it easier to maintain.
*   **Replace the Gate Tool:** In the long term, the legacy gate tool should be replaced with a modern implementation that uses the same version of `three.js` as the main application.
*   **Component-Based Architecture:** The application could be refactored to use a component-based architecture (e.g., using a library like React or Vue.js). This would make the code more modular and easier to manage.
*   **Build System:** A build system (e.g., webpack or Parcel) could be added to the project. This would allow for features like code splitting, minification, and hot module replacement.