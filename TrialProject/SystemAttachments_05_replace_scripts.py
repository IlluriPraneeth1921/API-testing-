import pandas as pd
import os
import re

# Read Excel file
excel_file = r'C:\Whitelisted\TrialProject\anyTagWithClass_analysis.xlsx'
df = pd.read_excel(excel_file)

# Filter for CrisisHousingAssessment
crisis_housing_df = df[df['Sub Module Name'].str.contains('CrisisHousingAssessment', na=False)]

# Base directory for scripts
base_dir = r'C:\Whitelisted\katalon_Pillar_4.3_BB_3\katalon-up\FEIAutomation\Scripts\WebApp\Carity\Standard\Regression Test\Features\Crisis\CrisisHousingAssessment'

# Generate class name to keyword mapping from Excel data
class_to_keyword = {}
for class_name in crisis_housing_df['Class Name provided'].unique():
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', class_name)
    safe_name = re.sub(r'_+', '_', safe_name).strip('_')
    method_name = f'findElement_{safe_name}'
    class_to_keyword[class_name] = f"CustomKeywords.'com.WebApp.BasicOperations_STD_Keywords.{method_name}'"

print("Class to keyword mapping:")
for class_name, keyword in class_to_keyword.items():
    print(f"'{class_name}' -> {keyword}")

# Find all .groovy files in SystemAttachments directory
groovy_files = []
if os.path.exists(base_dir):
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.groovy'):
                groovy_files.append(os.path.join(root, file))
else:
    print(f"Directory not found: {base_dir}")
    exit(1)

print(f"\nFound {len(groovy_files)} CrisisHousingAssessment script files")

successful_replacements = 0
failed_files = 0
total_replacements = 0

for file_path in groovy_files:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        file_replacements = 0
        
        # Replace each class pattern
        for class_name, keyword_call in class_to_keyword.items():
            # Pattern to match anyTagWithClass usage
            pattern = rf"findTestObject\('Object Repository/WebApp/Carity/ME/CommonElements/anyTagWithClass',\s*\[\('text'\):\s*'{re.escape(class_name)}',\s*\('number'\):\s*(\d+)\]\)"
            
            # Find all matches and replace
            matches = re.finditer(pattern, content)
            for match in matches:
                position = match.group(1)
                replacement = keyword_call + f'({position})'
                content = content.replace(match.group(0), replacement)
                file_replacements += 1
        
        # Write back if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            script_name = os.path.basename(file_path)
            print(f"UPDATED: {script_name}: {file_replacements} replacements")
            successful_replacements += 1
            total_replacements += file_replacements
        
    except Exception as e:
        script_name = os.path.basename(file_path)
        print(f"ERROR: {script_name}: {e}")
        failed_files += 1

print(f"\n=== SUMMARY ===")
print(f"Total files processed: {len(groovy_files)}")
print(f"Files with successful replacements: {successful_replacements}")
print(f"Files with errors: {failed_files}")
print(f"Total replacements made: {total_replacements}")

if total_replacements == 0:
    print("\nNo replacements made. This could mean:")
    print("- All scripts are already updated")
    print("- Pattern matching needs adjustment")
    print("- Scripts are in a different location")
else:
    print(f"\nSUCCESS: {total_replacements} anyTagWithClass calls replaced with CustomKeywords calls")