
import json
import re
import os

# File path
input_file = "C:/Users/mahro/.gemini/antigravity/brain/fe75e917-ef93-4936-95bf-45ba3e792c09/.system_generated/steps/445/output.txt"
output_file = "c:/Users/mahro/Desktop/prime-hotels - Copy - Copy/drop_policies.sql"

# Tables to target for cleanup
target_tables = [
    "announcements",
    "tasks",
    "learning_progress",
    "learning_assignments",
    "quizzes",
    "quiz_questions",
    "quiz_attempts",
    "quiz_answers",
    "profiles",
    "attendance",
    "leave_requests",
    "sop_documents",
    "announcement_acknowledgments",
    "goals",
    "payslips",
    "performance_reviews",
    "pii_access_logs",
    "shifts",
    "user_roles",
    "user_properties",
    "user_departments"
]

def generate_drops():
    try:
        if not os.path.exists(input_file):
            print(f"Input file not found: {input_file}")
            return

        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract JSON
        start = content.find('[')
        end = content.rfind(']') + 1
        if start == -1 or end == 0:
            print("No JSON found in file")
            return

        json_str = content[start:end]
        print(f"DEBUG: Extracted string (first 100 chars): {json_str[:100]}")
        
        # Helper to clean/fix common issues if needed
        # If it looks like it has escaped quotes:
        if '\\"' in json_str:
             print("DEBUG: Found escaped quotes, attempting to unescape...")
             json_str = json_str.replace('\\"', '"')

        policies = json.loads(json_str)

        drops = []
        for policy in policies:
            table = policy.get('tablename')
            name = policy.get('policyname')
            
            if table in target_tables:
                drops.append(f'DROP POLICY IF EXISTS "{name}" ON public.{table};')

        # Remove duplicates
        drops = list(set(drops))
        drops.sort()

        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("-- Generated DROP statements\n")
            for drop in drops:
                f.write(drop + "\n")

        print(f"Generated {len(drops)} DROP statements for {len(target_tables)} tables.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    generate_drops()
