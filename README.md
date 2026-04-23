# Grandview Design Studio

This is a web-based design studio for Grandview Fence products. It allows users to visualize different fence and gate styles in various scenes.

## Running the Application

To run the application, you'll need Node.js and npm installed.

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start the Development Server:**
    ```bash
    npm start
    ```

This will start a local development server. The application will then be available at the URL provided in the terminal (usually `http://127.0.0.1:8080`).

## How It Works

The application is a single-page application (SPA) built with vanilla JavaScript, HTML, and CSS. It uses the `three.js` library for 2D and 3D rendering.

The application is divided into two main components:

1.  **Main Application (`app.js`):** This is the entry point of the application. It handles the main UI, state management, and the 2D fence renderer.
2.  **Gate Tool (`gate_tool/`):** This is a 3D gate renderer that runs in an `iframe`. It is a legacy component with obfuscated code, and it uses an older version of `three.js`.

The main application and the gate tool communicate using the `postMessage` API.

## Project Structure

*   `index.html`: The main HTML file for the application.
*   `app.js`: The main JavaScript file for the application.
*   `styles.css`: The main stylesheet for the application.
*   `catalog.json`: A data file that defines the available scenes, styles, and assets.
*   `gate_tool/`: A directory containing the 3D gate renderer.
*   `assets/`: A directory containing images and other assets.
*   `documentation/`: A directory containing project documentation.
*   `scripts/`: A directory containing utility scripts.

## Known Issues

*   **Gate Tool Legacy Code:** The gate tool is a legacy component with obfuscated code. This makes it difficult to maintain and debug.
*   **Outdated `three.js`:** The gate tool uses an outdated version of `three.js` (r86). This should be updated in the future.

## Future Improvements

*   **Update `three.js`:** The `three.js` library should be updated to a more recent version.
*   **De-obfuscate the Gate Tool:** The `ultra_dsg_min.js` file should be de-obfuscated to make it easier to maintain.
*   **Replace the Gate Tool:** In the long term, the legacy gate tool should be replaced with a modern implementation that uses the same version of `three.js` as the main application.
*   **Component-Based Architecture:** The application could be refactored to use a component-based architecture (e.g., using a library like React or Vue.js). This would make the code more modular and easier to manage.
*   **Build System:** A build system (e.g., webpack or Parcel) could be added to the project. This would allow for features like code splitting, minification, and hot module replacement.
