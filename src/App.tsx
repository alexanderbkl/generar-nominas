import './App.css'
//import ./logo.png:
import logo from './logo.png'
import GenerarNominas from './GenerarNominas'

function App() {


  return (
    <>
      <div className='flex flex-col justify-center items-center h-screen'>
        <img src={logo} className='mt-10' alt="Logo" />
        <div className="flex flex-col w-full h-full">
          <h1 className='title'><u>GENERADOR DE NÓMINAS</u></h1>

          <GenerarNominas nameArea={{ x: 40, y: 550, width: 174, height: 10 }} dateArea={{ x: 290, y: 500, width: 157, height: 30 }} />

        </div>
      </div>
    </>
  )
}

export default App
