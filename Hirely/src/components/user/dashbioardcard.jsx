export const DashboardCard = ({ title, value, trend, icon }) => (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-slate-400">{title}</h2>
          {icon}
        </div>
        <p className="text-3xl font-bold mt-2">{value}</p>
        <p className="text-sm text-green-500 mt-2">{trend}</p>
      </div>
    </div>
  );