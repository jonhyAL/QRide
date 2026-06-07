const fs = require('fs');

let dashboard = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const regex = /if \(!user \|\| loadingData\) return <div className="min-h-screen flex items-center justify-center bg-\[#F4EFEA\] font-sans">[\s\S]*?<\/div>;/;

const newDashLoading = `if (!user || loadingData) return (
    <div className="min-h-screen bg-[#F4EFEA] text-gray-800 pb-28 relative overflow-hidden">
      {/* Skeleton Navbar */}
      <div className="bg-white sticky top-0 z-50 p-4 border-b border-gray-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" /><div className="h-6 w-32 bg-gray-200 rounded-lg animate-pulse hidden md:block" /></div>
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
      </div>
      
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:pl-24 lg:pl-[240px] pt-20 md:pt-8 transition-all">
        {/* Skeleton Greeting */}
        <div className="pt-4 mb-6">
          <div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse mb-2" />
          <div className="h-8 w-48 bg-gray-300 rounded-lg animate-pulse" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
             {/* Skeleton ID Card */}
             <div className="w-full h-48 bg-white border border-gray-100 rounded-3xl animate-pulse shadow-sm" />
             
             {/* Skeleton Vitals Grid */}
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-white p-5 rounded-3xl shadow-sm h-32 flex flex-col justify-between">
                    <div className="w-10 h-10 bg-gray-200 rounded-xl mb-3 animate-pulse" />
                    <div>
                      <div className="h-8 w-16 bg-gray-300 rounded-lg animate-pulse mb-2" />
                      <div className="h-4 w-20 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                  </div>
                ))}
             </div>
          </div>
          
          <div className="space-y-6">
             {/* Skeleton Action Grid */}
             <div className="bg-white rounded-[2rem] p-6 shadow-sm">
                <div className="h-6 w-40 bg-gray-300 rounded-lg animate-pulse mb-6" />
                <div className="grid grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                     <div key={i} className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );`;

if (regex.test(dashboard)) {
  dashboard = dashboard.replace(regex, newDashLoading);
  fs.writeFileSync('src/pages/Dashboard.jsx', dashboard);
  console.log('Fixed Dashboard loading string replacement');
} else {
  console.log('Regex did not match in Dashboard');
}
