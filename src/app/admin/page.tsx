import UserManagementDashboard from "@/components/UserManagementDashboard";
import ProtectedRoute from "@/components/ProtectedRoute";

const AdminPage = () => {
  const adminWallets = [
    "F1p6dNLSSTHi4QkUkRVXZw8QurZJKUDcvVBjfF683nU",
    "ABjnax7QfDmG6wR2KJoNc3UyiouwTEZ3b5tnTrLLyNSp"
  ];

  return (
    <ProtectedRoute adminWallets={adminWallets}>
      <div className="min-h-screen bg-black bg-gradient-to-br from-[#2b1c3b] via-[#2b1c3b] to-[#2b1c3b] bg-pattern p-3 sm:p-6 lg:p-12 xl:px-20 2xl:px-20">
        <div className="border-6 border-[#d3b136] animate-pulse-glow px-2 sm:px-6 py-0 min-h-[calc(100vh-1.5rem)] sm:min-h-[calc(100vh-3rem)] lg:min-h-[calc(100vh-6rem)] xl:min-h-[calc(100vh-8rem)] 2xl:min-h-[calc(100vh-10rem)] max-w-7xl mx-auto">
          <div className="text-white font-sans">
            <header className="flex flex-col lg:flex-row justify-between items-center px-2 sm:px-6 py-4 space-y-4 lg:space-y-0">
              <h1
                className="text-2xl sm:text-4xl lg:text-6xl font-bold tracking-[0.1em] sm:tracking-[0.2em] lg:tracking-[0.3em] text-gradient"
                style={{ fontFamily: "var(--font-hertical-sans)" }}
              >
                ADMIN DASHBOARD
              </h1>
            </header>
            <div className="px-2 sm:px-6 max-w-7xl mx-auto">
              <UserManagementDashboard />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminPage;
