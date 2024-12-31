import Footer from "./components/Footer";
import Navbar from "./components/Navbar";

// eslint-disable-next-line react/prop-types
export default function Layout({ children }) {
  return (
    <div className="flex justify-center min-h-screen px-5 py-0">
        <div className="w-full max-w-5xl">
            <Navbar/>
            {children}
            <Footer/>
        </div>
    </div>
  )
}
