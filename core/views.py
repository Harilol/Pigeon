from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import psycopg2
import os
import json
from dotenv import load_dotenv
from openai import OpenAI, APIError, AuthenticationError, NotFoundError, RateLimitError

load_dotenv()
def landing_page(request):
    return render(request, 'landing.html')

@csrf_exempt
def connect_page(request):
    if request.method == 'POST':
        try:
            conn = psycopg2.connect(
                host=request.POST.get('db_host', 'localhost'),
                user=request.POST.get('db_user', 'postgres'),
                password=request.POST.get('db_pass', ''),
                dbname=request.POST.get('db_name', 'postgres'),
                port=request.POST.get('db_port', '5432')
            )
            cur = conn.cursor()
            cur.execute("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            """)
            table_names = [row[0] for row in cur.fetchall()]
            schema = {}
            for t in table_names:
                cur.execute("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = %s ORDER BY ordinal_position
                """, (t,))
                schema[t] = [row[0] for row in cur.fetchall()]
            cur.close()
            conn.close()
            return JsonResponse({'status': 'success', 'data': schema})
        except Exception as e:
            return JsonResponse({'error': str(e)})
    return render(request, 'connect.html')

def fetch_schema(host, user, password, dbname, port):
    conn = psycopg2.connect(host=host, user=user, password=password, dbname=dbname, port=port)
    cur = conn.cursor()
    cur.execute("""
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    """)
    tables = [row[0] for row in cur.fetchall()]
    lines = []
    for t in tables:
        cur.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = %s ORDER BY ordinal_position
        """, (t,))
        cols = [row[0] for row in cur.fetchall()]
        lines.append(f"Table: {t}\nColumns: {', '.join(cols)}")
    cur.close()
    conn.close()
    return "\n\n".join(lines)
@csrf_exempt
def ask_ai(request):
    api_key = request.POST.get('api_key', '').strip()
    model_name = request.POST.get('model', '').strip()
    base_url = request.POST.get('base_url', '').strip()
    question = request.POST.get('q', '').strip()

    # 1. Validation
    if not api_key or not model_name or not base_url:
        return JsonResponse({'error': 'Please provide an API Key, Model Name, and Base URL in the AI Settings.'})
    if not question:
        return JsonResponse({'error': 'Please ask a question'})

    db_host = request.POST.get('db_host', 'localhost')
    db_user = request.POST.get('db_user', 'postgres')
    db_pass = request.POST.get('db_pass', '')
    db_name = request.POST.get('db_name', 'postgres')
    db_port = request.POST.get('db_port', '5432')

    # 2. Fetch Schema
    try:
        schema = fetch_schema(db_host, db_user, db_pass, db_name, db_port)
    except Exception as e:
        return JsonResponse({'error': 'Could not read DB schema: ' + str(e)})

    # 3. Define SQL Tool
    def run_sql(sql: str) -> dict:
        sql = sql.strip().rstrip(';')
        if not sql.upper().startswith('SELECT'):
            return {'error': 'Only SELECT queries are allowed.'}
        if ';' in sql:
            return {'error': 'Multiple statements not allowed.'}
        banned = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT', 'REVOKE', 'MERGE', 'REPLACE']
        for w in banned:
            if w in sql.upper():
                return {'error': f'Banned keyword: {w}'}
        wrapped = f"SELECT * FROM ({sql}) AS user_query LIMIT 100"
        try:
            conn = psycopg2.connect(host=db_host, user=db_user, password=db_pass, dbname=db_name, port=db_port)
            cur = conn.cursor()
            cur.execute("SET statement_timeout = 5000")
            cur.execute(wrapped)
            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()
            cur.close()
            conn.close()

            # Convert Decimal / datetime / date objects to strings so JSON can handle them
            from decimal import Decimal
            import datetime
            clean_rows = []
            for row in rows:
                clean_row = []
                for cell in row:
                    if isinstance(cell, Decimal):
                        clean_row.append(str(cell))
                    elif isinstance(cell, (datetime.datetime, datetime.date, datetime.time)):
                        clean_row.append(str(cell))
                    else:
                        clean_row.append(cell)
                clean_rows.append(clean_row)

            return {'columns': columns, 'rows': clean_rows, 'sql': sql}
        except Exception as e:
            return {'error': str(e)}

    # 4. OpenAI SDK Integration (Universal)
    try:
        client = OpenAI(api_key=api_key, base_url=base_url)
        
        system_prompt = f"""You are a helpful data assistant. You have access to a PostgreSQL database through the run_sql tool.

        SCHEMA:
        {schema}

        Rules:
        - Use run_sql for any data question.
        - After running a query, the UI will render the raw rows as a table BELOW your message. DO NOT repeat the raw data in your reply.
        - Instead, write a SHORT, natural language summary — 1 to 3 sentences. Point out trends, notable values, or answer the question directly.
        - Example: "You have 14 items across 4 categories. Electronics dominate, and the Notebook is your highest-stocked item."
        - If the query returned zero rows, say so clearly and briefly.
        - If the query returned exactly one value (like a COUNT), just state it: "You have 14 items."
        - Use **bold** sparingly for key numbers. Do NOT create markdown tables — the UI handles that.
        - If the question is small talk, just reply normally."""

        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question}
            ],
            tools=[{
                "type": "function",
                "function": {
                    "name": "run_sql",
                    "description": "Runs a read-only SQL SELECT query on the PostgreSQL database.",
                    "parameters": {
                        "type": "object",
                        "properties": {"sql": {"type": "string", "description": "The SQL SELECT statement to execute."}},
                        "required": ["sql"]
                    }
                }
            }]
        )

        msg = response.choices[0].message

        # --- Case 1: Native tool call (OpenAI format) ---
        if msg.tool_calls:
            tool_call = msg.tool_calls[0]
            sql = json.loads(tool_call.function.arguments).get('sql', '')
            result = run_sql(sql)

            followup = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question},
                    msg,
                    {"role": "tool", "tool_call_id": tool_call.id, "content": json.dumps(result)}
                ],
            )
            return JsonResponse({
                'answer': followup.choices[0].message.content or 'Here are the results.',
                'sql': result.get('sql', sql),
                'columns': result.get('columns', []),
                'rows': result.get('rows', [])
            })

        # --- Case 2: Text-based tool call (some free/small models) ---
        text = msg.content or ''
        if '<tool_call>' in text and 'run_sql' in text:
            import re
            # Extract the SQL from <parameter=sql>...</parameter>
            match = re.search(r'<parameter=sql>(.*?)</parameter>', text, re.DOTALL)
            if match:
                sql = match.group(1).strip()
                result = run_sql(sql)

                followup = client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": question},
                        {"role": "assistant", "content": text},
                        {"role": "user", "content": f"Tool result: {json.dumps(result)}\n\nNow answer the user's original question in plain English based on this data."}
                    ],
                )
                return JsonResponse({
                    'answer': followup.choices[0].message.content or 'Here are the results.',
                    'sql': result.get('sql', sql),
                    'columns': result.get('columns', []),
                    'rows': result.get('rows', [])
                })

        # --- Case 3: Normal chat reply ---
        return JsonResponse({'answer': text})
            
    # 5. Specific Error Handling
    except AuthenticationError:
        return JsonResponse({'error': 'Invalid API Key or Base URL. Please check your AI Settings.'})
    except NotFoundError:
        return JsonResponse({'error': f'Model "{model_name}" not found. Check the spelling or provider.'})
    except RateLimitError:
        return JsonResponse({'error': 'Quota exceeded. Please wait a moment or check your API plan.'})
    except APIError as e:
        return JsonResponse({'error': f'API Error: {str(e)}'})
    except Exception as e:
        return JsonResponse({'error': str(e)})