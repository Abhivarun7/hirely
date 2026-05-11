import { Outlet, Link } from 'react-router-dom';
import { Linkedin, Twitter, Facebook, Globe } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="bg-abstract-deep relative min-h-screen flex flex-col">
      {/* Top thin glass nav */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/30 fixed top-0 left-0 right-0 z-50">
        <div className="flex justify-between items-center w-full px-4 sm:px-8 py-4 max-w-7xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 w-fit">
            <span className="text-2xl font-black tracking-tighter text-[#ff6b00] orange-glow-text">
              Hirely
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              to="/contact"
              className="text-sm font-medium text-[#5d5e60] hover:text-[#a04100] transition-colors"
            >
              Help
            </Link>
            <button
              type="button"
              className="text-[#a04100] hover:text-[#ff6b00] transition-colors active:opacity-80"
              aria-label="Language"
            >
              <Globe className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center pt-24 pb-12 px-4 sm:px-8">
        <div className="w-full max-w-7xl">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/5 backdrop-blur-xl border-t border-white/20 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-4 sm:px-8 py-4 max-w-7xl mx-auto gap-4">
          <span className="text-lg font-black tracking-tighter text-[#1b1b1e]">Hirely</span>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link
              to="/privacy"
              className="text-xs text-[#5d5e60] hover:text-[#a04100] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-xs text-[#5d5e60] hover:text-[#a04100] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/contact"
              className="text-xs text-[#5d5e60] hover:text-[#a04100] transition-colors"
            >
              Contact Support
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#"
              className="w-8 h-8 rounded-lg bg-white/40 border border-white/60 flex items-center justify-center text-[#5d5e60] hover:text-[#a04100] hover:bg-white/60 transition-all"
            >
              <Linkedin className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="w-8 h-8 rounded-lg bg-white/40 border border-white/60 flex items-center justify-center text-[#5d5e60] hover:text-[#a04100] hover:bg-white/60 transition-all"
            >
              <Twitter className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="w-8 h-8 rounded-lg bg-white/40 border border-white/60 flex items-center justify-center text-[#5d5e60] hover:text-[#a04100] hover:bg-white/60 transition-all"
            >
              <Facebook className="w-4 h-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
