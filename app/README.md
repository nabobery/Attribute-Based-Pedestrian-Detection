## Starting The Flask BackEnd

1. Navigate to the `flask-app` directory:
    ```bash
    cd flask-app
    ```
2. Create a virtual environment:
    ```bash
    python -m venv env
    ```
3. Activate the virtual environment:
    - On Windows:
        ```bash
        .\env\Scripts\activate
        ```
    - On Unix or MacOS:
        ```bash
        source env/bin/activate
        ```
4. Install the requirements:
    ```bash
    pip install -r requirements.txt
    ```
5. Start the Flask app:
    ```bash
    python app.py
    ```

## Starting The React App

1. Navigate to the `react-app` directory:
    ```bash
    cd react-app
    ```
2. Install the dependencies from `package.json`:
    ```bash
    npm install
    ```
3. Start the app:
    ```bash
    npm run dev
    ```
4. Open your browser and navigate to `http://localhost:5173/` to view the app.