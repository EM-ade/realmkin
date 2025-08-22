import UserManagementDashboard from "@/components/UserManagementDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import Link from "next/link";

const AdminPage = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-black bg-gradient-to-br from-[#2b1c3b] via-[#2b1c3b] to-[#2b1c3b] bg-pattern p-3 sm:p-4 md:p-6 lg:p-8 xl:px-20 2xl:px-20">
          <div className="border-6 border-[#d3b136] animate-pulse-glow px-2 sm:px-4 md:px-6 py-0 min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-4rem)] xl:min-h-[calc(100vh-5rem)] 2xl:min-h-[calc(100vh-6rem)] max-w-7xl mx-auto">
            <div className="text-white font-sans">
              <header className="flex flex-col sm:flex-row justify-between items-center px-2 sm:px-4 md:px-6 py-4 space-y-4 sm:space-y-0">
                <h1
                  className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-[0.1em] sm:tracking-[0.15em] md:tracking-[0.2em] lg:tracking-[0.25em] xl:tracking-[0.3em] text-gradient"
                  style={{ fontFamily: "var(--font-hertical-sans)" }}
                >
                  ADMIN DASHBOARD
                </h1>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 md:space-x-3 w-full sm:w-auto">
                  <Link
                    href="/"
                    className="relative group border-2 border-[#d3b136] bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 sm:px-4 transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/20 w-full sm:w-auto btn-enhanced"
                    style={{
                      clipPath:
                        "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                    }}
                  >
                    <div
                      className="flex items-center justify-center space-x-2"
                      style={{ fontFamily: "var(--font-gothic-cg)" }}
                    >
                      <span className="text-base sm:text-lg">🏠</span>
                      <span className="text-xs sm:text-sm font-bold tracking-wide">
                        HOME
                      </span>
                    </div>
                  </Link>
                </div>
              </header>
              <div className="px-2 sm:px-4 md:px-6 max-w-7xl mx-auto">
                <UserManagementDashboard />
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
};

export default AdminPage;
