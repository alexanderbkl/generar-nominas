import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs'
import { PDFDocument } from 'pdf-lib';









interface GenerarNominas {
  nameArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dateArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

}


type MonthMap = {
  [key: string]: {
    number: number;
    name: string;
  };
}

const monthsMap: MonthMap = {
  ENE: {
    number: 1,
    name: "Enero"
  },
  FEB: {
    number: 2,
    name: "Febrero"
  },
  MAR: {
    number: 3,
    name: "Marzo"
  },
  ABR: {
    number: 4,
    name: "Abril"
  },
  MAY: {
    number: 5,
    name: "Mayo"
  },
  JUN: {
    number: 6,
    name: "Junio"
  },
  JUL: {
    number: 7,
    name: "Julio"
  },
  AGO: {
    number: 8,
    name: "Agosto"
  },
  SEP: {
    number: 9,
    name: "Septiembre"
  },
  OCT: {
    number: 10,
    name: "Octubre"
  },
  NOV: {
    number: 11,
    name: "Noviembre"
  },
  DIC: {
    number: 12,
    name: "Diciembre"
  },
  // Add other months as needed
};



const GenerarNominas = ({ dateArea, nameArea }: GenerarNominas) => {

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      // Call the function to process the file here
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const [editMode, setEditMode] = useState<{ [key: number]: boolean }>({});
  const [editedTitles, setEditedTitles] = useState<{ [key: number]: string }>({});


  const handleEditClick = (index: number) => {
    setEditMode(prev => ({ ...prev, [index]: true }));
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newTitle = e.target.value;
    setEditedTitles(prev => ({ ...prev, [index]: newTitle }));
  };

  const handleConfirmEdit = (index: number) => {
    if (editedTitles[index] !== undefined) {
      setPDFList(currentList =>
        currentList.map((item, idx) =>
          idx === index ? { ...item, title: editedTitles[index] } : item)
      );
    }
    setEditMode(prev => ({ ...prev, [index]: false }));
  };

  const handleRemove = (index: number) => {
    setPDFList(currentList => currentList.filter((_, idx) => idx !== index));
  };


  useEffect(() => {
    const fetchPDFText = async () => {
      if (!selectedFile) return;
      const loadingTask = pdfjsLib.getDocument(await selectedFile.arrayBuffer());
      const pdf = await loadingTask.promise;
      const pages = pdf.numPages;


      for (let i = 1; i <= pages; i++) {
        let extracted = '';
        const page = await pdf.getPage(i); // Adjust page number as needed

        const textContent = await page.getTextContent();

        let monthCode = '';
        let yearCode = '';
        let name = '';
        textContent.items.forEach((item) => {
          //log the text items on the console
          if ('transform' in item) {
            //if (names.some(name => item.str.toLowerCase().includes(name))) {

            // tx[4] and tx[5] are the x and y coordinates of the text item
            const x = item.transform[4];
            const y = item.transform[5];
            const height = item.height;

            console.log("X: " + x + " Y: " + y);
            console.log(item);

            // Check if the text item falls within the specified area
            if (x >= dateArea.x - 10 && x <= dateArea.x + 10 &&
              y >= dateArea.y && y <= dateArea.y + dateArea.height) {
              console.log(item);
              console.log("X: " + x + " Y: " + y);

              console.log("area.x: " + dateArea.x + " area.y: " + dateArea.y + " area.width: " + dateArea.width + " area.height: " + dateArea.height + "");
              //split item.str spaces to get the words
              const words = item.str.split(' ');
              console.log(words)
              monthCode = words[2]; // Assuming 'OCT', 'NOV', etc.
              yearCode = words[3];


              // Add your code here

            }
            if (x >= nameArea.x - 10 && x <= nameArea.x + 10 &&
              y >= nameArea.y - 10 && y <= nameArea.y + 10 &&
              height >= nameArea.height - 15 && height <= nameArea.height + 15) {
              name = item.str;
            }
          }
        });
        if (monthsMap[monthCode]) {
          extracted += "20" + yearCode + monthsMap[monthCode].number + "_Nomina " + monthsMap[monthCode].name + "_" + name;
        }



        if (extracted) {
          await savePageAsPDF(await selectedFile.arrayBuffer(), i, extracted.trim() + '.pdf');
        }

      }
    }

    fetchPDFText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  type PDFItem = {
    pdfBytes: Uint8Array;
    title: string;
    type: string; // Fix: Added missing type annotation
  };

  type PDFList = PDFItem[];


  const defaultPDFType = 'application/pdf';

  const [pdfList, setPDFList] = useState<PDFList>([]);


  // Function to save a specific page as a new PDF
  const savePageAsPDF = async (pdfDoc: ArrayBuffer, pageNum: number, title: string) => {
    const existingPdfDoc = await PDFDocument.load(pdfDoc);

    const newPdfDoc = await PDFDocument.create();
    const [copiedPage] = await newPdfDoc.copyPages(existingPdfDoc, [pageNum - 1]);
    newPdfDoc.addPage(copiedPage);

    const pdfBytes = await newPdfDoc.save();

    const newPDFFile: PDFList = [{
      pdfBytes,
      title,
      type: defaultPDFType,
    }]

    setPDFList((pdfList) => [
      ...pdfList,
      newPDFFile[0]
    ]);

    //download(pdfBytes, date, 'application/pdf');
  };

  // Function to trigger file download
  const download = (data: Uint8Array, filename: string, type: string) => {
    const file = new Blob([data], { type: type });
    const a = document.createElement('a');
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  };

  return (
    <div className="container mx-auto p-4">
      <h3 className="text-3xl font-bold my-4">Generador de Nóminas PDF</h3>
      <div className="flex justify-center w-full">
        <div className="flex flex-col mb-4">
          <button
            onClick={triggerFileInput}
            className="bg-blue-500 w-full hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Seleccionar Archivo PDF
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept="application/pdf"
          />
          {selectedFile && (
            <span className="ml-4 text-gray-600">
              Archivo seleccionado: {selectedFile.name}
            </span>
          )}
        </div>
      </div>
      <h3 className="text-3xl font-bold">PDFs Generados:</h3>
      {pdfList && pdfList.length > 0 && (
        <div className="my-4">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              pdfList.forEach((pdf) => {
                download(pdf.pdfBytes, pdf.title, pdf.type);
              });
            }}
          >
            Descargar todos ({pdfList.length})
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {pdfList.map((pdf, index) => (
              <tr key={index}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  {editMode[index] ? (
                    <>
                      <input
                        type="text"
                        value={editedTitles[index] ?? pdf.title}
                        onChange={(e) => handleTitleChange(e, index)}
                        className="form-input w-full px-3 py-1 border border-gray-300"
                      />
                      <button
                        onClick={() => handleConfirmEdit(index)}
                        className="text-sm text-green-500 hover:text-green-800 ml-3"
                      >
                        Confirmar
                      </button>
                    </>
                  ) : (
                    <p className="text-gray-900 whitespace-no-wrap text-left">{pdf.title}</p>
                  )}
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <button>
                    <a
                      href={URL.createObjectURL(new Blob([pdf.pdfBytes], { type: pdf.type }))}
                      download={pdf.title}
                      className="btn btn-primary text-blue-500 hover:text-blue-800"
                    >
                      Descargar
                    </a>
                  </button>
                  <button
                    onClick={() => handleEditClick(index)}
                    className="text-sm text-blue-500 hover:text-blue-800 mr-3"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleRemove(index)}
                    className="text-sm text-red-500 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GenerarNominas;