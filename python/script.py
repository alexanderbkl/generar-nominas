import os
import re
import fitz  # PyMuPDF
from PyPDF2 import PdfWriter, PdfReader

def process_pdf(pdf_path, name_area, date_area, margin=20):
    months_map = {
        "ENE": {"number": 1, "name": "Enero"},
        "FEB": {"number": 2, "name": "Febrero"},
        "MAR": {"number": 3, "name": "Marzo"},
        "ABR": {"number": 4, "name": "Abril"},
        "MAY": {"number": 5, "name": "Mayo"},
        "JUN": {"number": 6, "name": "Junio"},
        "JUL": {"number": 7, "name": "Julio"},
        "AGO": {"number": 8, "name": "Agosto"},
        "SEP": {"number": 9, "name": "Septiembre"},
        "OCT": {"number": 10, "name": "Octubre"},
        "NOV": {"number": 11, "name": "Noviembre"},
        "DIC": {"number": 12, "name": "Diciembre"}
    }

    doc = fitz.open(pdf_path)
    output_folder = "./Nóminas generadas"

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text_dict = page.get_text("dict")
        name = ""
        month_code = ""
        year_code = ""
        dni = ""
        postal_code = ""

        for block in text_dict["blocks"]:
            if "lines" in block:  # Check if lines key exists
                for line in block["lines"]:
                    for span in line["spans"]:
                        x, y, w, h = span['bbox']  # Extract x and y from bbox
                        text = span['text']

                        if "30205" in text or "7758" in text:
                            print(f"Text:\n{text}\nat (X: {x}, Y: {y})\nwith width {w} and height {h}\n\n")

                        # Check if text is within name area with margin
                        if (name_area['x'] - 600 <= x <= name_area['x'] + name_area['width'] + 600 and
                            name_area['y'] - 5 <= y <= name_area['y'] + 5 and
                            name_area['width'] - 300 <= w <= name_area['width'] + 300 and
                            name_area['height'] - 5 <= h <= name_area['height'] + 5):

                            #print(f"Name found: {text} at ({x}, {y})\nwidth {w} and height {h}\n")
                            name = text.strip()
                        if (postal_code_area['x'] - 400 <= x <= postal_code_area['x'] + 400 and
                            postal_code_area['y'] - margin <= y <= postal_code_area['y'] + margin and
                            postal_code_area['width'] - 400 <= w <= postal_code_area['width'] + 400 and
                            postal_code_area['height'] - 300 <= h <= postal_code_area['height'] + 300):
                            postal_code_parts = text.split(" ")
                            print(postal_code_parts)
                            # Regex for digits of any length (postal code)
                            postal_code_regex = r"\d+"
                            for part in postal_code_parts:
                                if re.match(postal_code_regex, part):
                                    postal_code = part
                                    break
                        if (
                            dni_area['y'] - margin <= y <= dni_area['y'] + margin and
                            dni_area['width'] - 50 <= w <= dni_area['width'] + 50 and
                            dni_area['height'] - 5 <= h <= dni_area['height'] + 5):
                            dni_parts = text.split(" ")
                            # Regex for DNI/NIE
                            dni_regex = r"\b[XYZ]?\d{7,8}[A-Z]\b"

                            for part in dni_parts:
                                if re.match(dni_regex, part):
                                    dni = part
                                    break

                        # Check if text is within date area with margin
                        if (date_area['x'] - 500 <= x <= date_area['x'] + 500 and
                            date_area['y'] - 5 <= y <= date_area['y'] + 5):
                            #print(f"Date found: {text} at ({x}, {y})")
                            #Text I'm getting:
                            #20 MENS 02 OCT 23 a 31 OCT 23
                            # Select "02" and "OCT" by splitting the text
                            date = text
                            date_regex = r"MENS\s+(\d{2})\s+([A-Z]{3})\s+(\d{2})"

                            match = re.search(date_regex, date)
                            if match:
                                month_code = match.group(2)
                                #day = match.group(1)
                                year_code = match.group(3)
                                #print(f"Month Code: {month_code}, Year Code: {year_code}")
        if month_code in months_map:
            temp_file_name = f"temp_{page_num}.pdf"
            base_file_name = f"20{year_code}{months_map[month_code]['number']:02d}_Nomina {months_map[month_code]['name']}_{name}_{dni}"

            file_name = f"{base_file_name}.pdf"


            # Create a new PDF document with the current page
            new_doc = fitz.open()
            new_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)

            # Save the new PDF document temporarily
            temp_pdf_path = os.path.join(output_folder, temp_file_name)

            new_doc.save(temp_pdf_path)
            new_doc.close()
            
            #Encrypt the PDF using PyPDF2
            pdf_reader  = PdfReader(os.path.join(output_folder, temp_file_name))
            pdf_writer = PdfWriter()

            

            encrypted_pdf_path = os.path.join(output_folder, file_name)
            indexed_file_name = f"{base_file_name}_1.pdf"
            indexed_encrypted_pdf_path = os.path.join(output_folder, indexed_file_name)

            if os.path.exists(encrypted_pdf_path):
                # If the file already exists, modify the name to add a number
                new_file_name = f"{base_file_name}_1.pdf"
                new_encrypted_pdf_path = os.path.join(output_folder, new_file_name)
                # Check if a "_1" version of the file already exists
                if not os.path.exists(new_encrypted_pdf_path):
                    # Rename the existing file to append "_1"
                    os.rename(encrypted_pdf_path, new_encrypted_pdf_path)
                    print(f"File {file_name} already exists, renaming to {new_file_name}")

                # Start numbering from 2 for the new file
                index = 2
                while True:
                    file_name = f"{base_file_name}_{index}.pdf"
                    encrypted_pdf_path = os.path.join(output_folder, file_name)
                    if not os.path.exists(encrypted_pdf_path):
                        break
                    index += 1
            elif os.path.exists(indexed_encrypted_pdf_path):
                # count the number of files with the same name to get the index
                index = 2
                while True:
                    file_name = f"{base_file_name}_{index}.pdf"
                    encrypted_pdf_path = os.path.join(output_folder, file_name)
                    if not os.path.exists(encrypted_pdf_path):
                        break
                    index += 1
            else:
                # If the file doesn't exist, use the original name
                encrypted_pdf_path = os.path.join(output_folder, file_name)
                

                #existing_pdf_reader = PdfReader(encrypted_pdf_path)
                # Append existing pages
            for page in pdf_reader.pages:
                pdf_writer.add_page(page)

            #for i in pdf_reader.pages:
            #    pdf_writer.add_page(i)

            # Encrypt the PDF

            # if postal code is empty, print a warning
            if not postal_code:
                print(f"WARNING: Postal code not found for {file_name}")
            pdf_writer.encrypt(user_password=postal_code, owner_pwd=None, use_128bit=True)

            # Write the encrypted PDF to a file
            

            with open(encrypted_pdf_path, 'wb') as fh:
                pdf_writer.write(fh)

            # Close the PDF reader and writer
                
            print(f"Created {file_name}")
            # Delete the temporary PDF document
            os.remove(temp_pdf_path)

            
            
            
        else:
            print(f"Month code {month_code} not found in months map")
            
    doc.close()

# Define the areas for names and dates based on the React prompt
name_area = {
    "x": 273,
    "y": 159,
    "width": 445,
    "height": 173
}

date_area = {
    "x": 260,
    "y": 304,
    "width": 445,
    "height": 300
}

dni_area = {
    "x": 390,
    "y": 282,
    "width": 500,
    "height": 295,
}

postal_code_area = {
    "x": 273,
    "y": 183,
    "width": 385,
    "height": 197
}

# Path to the PDF file
pdf_path = "./nominas.pdf"
#pdf_path = "./Nomina censurada.pdf"

print("Iniciando programa...")

process_pdf(pdf_path, name_area, date_area)