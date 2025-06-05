import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Beluva Interiors | Home',
  description: 'Transform your space with AI-powered interior design recommendations',
};

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="w-full bg-primary-600 text-white">
        <div className="container mx-auto px-4 py-6 md:py-8">
          <nav className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-serif font-bold">Beluva Interiors</h1>
            </div>
            <div className="space-x-4">
              <Link href="/login" className="btn btn-outline border-white text-white hover:bg-primary-700">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-secondary">
                Sign up
              </Link>
            </div>
          </nav>
        </div>
      </div>

      <section className="w-full bg-primary-600 pb-16 text-white">
        <div className="container mx-auto px-4">
          <div className="py-16 md:py-24">
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Transform Your Space with AI
            </h2>
            <p className="text-xl max-w-2xl mb-8">
              Upload a photo of your room, set your budget, and get personalized furniture recommendations instantly.
            </p>
            <Link href="/upload" className="btn btn-secondary">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card">
            <div className="mb-4 text-primary-600 font-bold text-xl">Step 1</div>
            <h3 className="font-serif text-xl font-bold mb-2">Upload Your Room Photo</h3>
            <p className="text-slate-600">
              Take a photo of your room and upload it to our platform. We'll analyze the space, style, and dimensions.
            </p>
          </div>
          <div className="card">
            <div className="mb-4 text-primary-600 font-bold text-xl">Step 2</div>
            <h3 className="font-serif text-xl font-bold mb-2">Set Your Preferences</h3>
            <p className="text-slate-600">
              Specify your budget, preferred styles, and what furniture items you're looking for.
            </p>
          </div>
          <div className="card">
            <div className="mb-4 text-primary-600 font-bold text-xl">Step 3</div>
            <h3 className="font-serif text-xl font-bold mb-2">Get AI Recommendations</h3>
            <p className="text-slate-600">
              Our AI will generate personalized furniture recommendations and a visualization of your room with the new items.
            </p>
          </div>
        </div>
      </section>

      <section className="w-full bg-slate-100 py-16">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-3xl font-bold text-center mb-12">Why Choose Beluva Interiors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start">
              <div className="bg-primary-600 text-white p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">AI-Powered Recommendations</h3>
                <p className="text-slate-600">
                  Our advanced AI understands your space and preferences to recommend furniture that truly fits your needs.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary-600 text-white p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">Budget-Friendly Choices</h3>
                <p className="text-slate-600">
                  Set your budget and we'll only recommend furniture that matches your financial constraints.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary-600 text-white p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">Visualize Before You Buy</h3>
                <p className="text-slate-600">
                  See how the furniture will look in your space with our realistic room visualization technology.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-primary-600 text-white p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold mb-2">Save Time and Effort</h3>
                <p className="text-slate-600">
                  No more endless browsing through furniture catalogs. Get personalized recommendations in minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="w-full bg-slate-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="font-serif text-xl font-bold">Beluva Interiors</h2>
              <p className="text-slate-300">AI-powered interior design recommendations</p>
            </div>
            <div className="flex space-x-4">
              <Link href="/about" className="text-slate-300 hover:text-white">
                About
              </Link>
              <Link href="/privacy" className="text-slate-300 hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="text-slate-300 hover:text-white">
                Terms
              </Link>
              <Link href="/contact" className="text-slate-300 hover:text-white">
                Contact
              </Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-700 text-center text-slate-300">
            <p>&copy; {new Date().getFullYear()} Beluva Interiors. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
