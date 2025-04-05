import os
import json
import logging
import requests
import time
from flask import Flask, render_template, request, jsonify, session
from werkzeug.middleware.proxy_fix import ProxyFix
from urllib.parse import urlparse

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create and configure the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default_secret_key_for_development")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Initialize request history in session
@app.before_request
def before_request():
    if 'request_history' not in session:
        session['request_history'] = []

@app.route('/')
def index():
    """Render the main API testing interface."""
    return render_template('index.html')

@app.route('/trading', methods=['GET', 'POST'])
def trading():
    """Render and handle the trading form."""
    result = None
    error = None
    status_code = None
    
    if request.method == 'POST':
        try:
            # Get form data
            trading_data = {
                "symbol": request.form.get('symbol'),
                "direction": request.form.get('direction'),
                "owner": request.form.get('owner'),
                "entryPrice": request.form.get('entryPrice'),
                "takeProfit": int(request.form.get('takeProfit')),
                "stopLoss": int(request.form.get('stopLoss'))
            }
            
            # Send POST request to the webhook
            response = requests.post(
                'https://dila-webhook-tv.work', 
                json=trading_data,
                headers={'Content-Type': 'application/json'}
            )
            
            # Get response data
            status_code = response.status_code
            try:
                result = response.json()
            except:
                result = response.text
                
        except Exception as e:
            error = str(e)
    
    return render_template('trading.html', result=result, error=error, status_code=status_code)

@app.route('/send_request', methods=['POST'])
def send_request():
    """Handle the API request and return the response."""
    try:
        data = request.json
        url = data.get('url', '')
        method = data.get('method', 'GET')
        headers = data.get('headers', {})
        request_body = data.get('body', '')
        content_type = data.get('contentType', 'application/json')
        
        # Validate URL
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return jsonify({'error': 'Invalid URL format. Please include http:// or https://'}), 400
        
        # Convert headers from array of objects to dictionary
        headers_dict = {}
        if headers:
            for header in headers:
                if header.get('key'):
                    headers_dict[header['key']] = header.get('value', '')
        
        # Add content-type header if not present
        if 'Content-Type' not in headers_dict and content_type:
            headers_dict['Content-Type'] = content_type
            
        # Prepare request body based on content type
        request_data = None
        if request_body:
            if content_type == 'application/json':
                try:
                    request_data = json.loads(request_body)
                except json.JSONDecodeError:
                    return jsonify({'error': 'Invalid JSON in request body'}), 400
            elif content_type == 'application/x-www-form-urlencoded':
                try:
                    request_data = {}
                    for line in request_body.split('&'):
                        if '=' in line:
                            key, value = line.split('=', 1)
                            request_data[key] = value
                except Exception:
                    return jsonify({'error': 'Invalid form data in request body'}), 400
            else:
                request_data = request_body
        
        # Make the request
        start_time = time.time()
        response = None
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers_dict,
                json=request_data if content_type == 'application/json' and request_data else None,
                data=request_data if content_type != 'application/json' and request_data else None
            )
            elapsed_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Try to parse response as JSON
            response_body = None
            try:
                response_body = response.json()
                response_body = json.dumps(response_body, indent=2)
            except:
                response_body = response.text
            
            # Save to history
            request_info = {
                'url': url,
                'method': method,
                'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
                'status': response.status_code
            }
            history = session.get('request_history', [])
            history.insert(0, request_info)  # Add to the beginning
            # Keep only the last 10 requests
            session['request_history'] = history[:10]
            session.modified = True
            
            # Format response
            result = {
                'status': response.status_code,
                'statusText': response.reason,
                'headers': dict(response.headers),
                'body': response_body,
                'time': round(elapsed_time, 2),
                'size': len(response.content),
                'curl': generate_curl_command(method, url, headers_dict, request_body, content_type)
            }
            
            return jsonify(result)
            
        except requests.exceptions.ConnectionError:
            return jsonify({'error': 'Connection error. Please check the URL and try again.'}), 500
        except requests.exceptions.Timeout:
            return jsonify({'error': 'Request timed out. Please try again later.'}), 500
        except requests.exceptions.RequestException as e:
            return jsonify({'error': f'Request failed: {str(e)}'}), 500
    
    except Exception as e:
        logging.error(f"Error processing request: {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/get_history', methods=['GET'])
def get_history():
    """Return the request history from the session."""
    history = session.get('request_history', [])
    return jsonify(history)

def generate_curl_command(method, url, headers, body, content_type):
    """Generate a curl command from the request data."""
    curl = f"curl -X {method} '{url}'"
    
    for key, value in headers.items():
        curl += f" -H '{key}: {value}'"
    
    if body:
        if content_type == 'application/json':
            try:
                # Format the JSON properly
                formatted_body = json.dumps(json.loads(body)).replace("'", "\\'")
                curl += f" -d '{formatted_body}'"
            except:
                curl += f" -d '{body}'"
        else:
            curl += f" -d '{body}'"
    
    return curl

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
