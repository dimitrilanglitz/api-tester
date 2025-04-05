# API Tester

A web-based API testing platform that allows users to send HTTP requests and view formatted responses.

## Features

- Web interface for sending HTTP requests (GET, POST, PUT, DELETE)
- Input fields for URL, headers, and request body
- Display of response data, status codes, and headers
- History of previous requests
- Support for different content types (JSON, form data, plain text)
- Basic request validation
- Copy-to-curl functionality for sharing requests
- JSON formatting and syntax highlighting for responses
- Response time metrics
- Error handling for malformed requests
- Mobile-responsive design
- Support for authorization headers

## Technologies Used

- **Backend**: Flask, Requests library
- **Frontend**: HTML5, Bootstrap 5, Vanilla JavaScript
- **Syntax Highlighting**: Prism.js

## Setup and Installation

1. Clone the repository
2. Set up a virtual environment (recommended)
3. Install dependencies:
   ```
   pip install flask requests
   ```
4. Run the application:
   ```
   python main.py
   ```
5. Access the application at http://localhost:5000

## Environment Variables

- `SESSION_SECRET`: Secret key for session encryption

## Usage

1. Enter a URL in the request field
2. Select the HTTP method (GET, POST, PUT, DELETE, etc.)
3. Add any required headers
4. For POST/PUT requests, add a request body and select the content type
5. Click "Send" to execute the request
6. View the formatted response with status code, headers, and body

## License

MIT
