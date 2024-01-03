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

        for block in text_dict["blocks"]:
            if "lines" in block:  # Check if lines key exists
                for line in block["lines"]:
                    for span in line["spans"]:
                        x, y, w, h = span['bbox']  # Extract x and y from bbox
                        text = span['text']

                        #if "ADRI" in text or "7758" in text:
                        #    print(f"Text:\n{text}\nat (X: {x}, Y: {y})\nwith width {w} and height {h}\n\n")

                        # Check if text is within name area with margin
                        if (name_area['x'] - 600 <= x <= name_area['x'] + name_area['width'] + 600 and
                            name_area['y'] - 5 <= y <= name_area['y'] + 5 and
                            name_area['width'] - 300 <= w <= name_area['width'] + 300 and
                            name_area['height'] - 5 <= h <= name_area['height'] + 5):

                            #print(f"Name found: {text} at ({x}, {y})\nwidth {w} and height {h}\n")
                            name = text.strip()
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
            file_name = f"20{year_code}{months_map[month_code]['number']:02d}_Nomina {months_map[month_code]['name']}_{name}.pdf"


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

            if os.path.exists(encrypted_pdf_path):
                existing_pdf_reader = PdfReader(encrypted_pdf_path)
                # Append existing pages
                for i in existing_pdf_reader.pages:
                    pdf_writer.add_page(i)

            for i in pdf_reader.pages:
                pdf_writer.add_page(i)

            pdf_writer.encrypt(user_password=dni, owner_pwd=None, use_128bit=True)

            with open(encrypted_pdf_path, 'wb') as fh:
                pdf_writer.write(fh)
                
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

# Path to the PDF file
pdf_path = "./nominas.pdf"
#pdf_path = "./Nomina censurada.pdf"

print("Iniciando programa...")

process_pdf(pdf_path, name_area, date_area)