interface TabNavigationProps {
  activeTab: "apprenant" | "etablissement";
  onTabChange: (tab: "apprenant" | "etablissement") => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex bg-gray-100 rounded-xl p-1">
      <button
        onClick={() => onTabChange("apprenant")}
        className={`flex-1 py-3 px-4 rounded-lg transition-colors ${
          activeTab === "apprenant"
            ? "bg-white text-[#F43F5E] shadow-sm"
            : "text-gray-600 hover:text-[#F43F5E]"
        }`}
      >
        Apprenant
      </button>
      <button
        onClick={() => onTabChange("etablissement")}
        className={`flex-1 py-3 px-4 rounded-lg transition-colors ${
          activeTab === "etablissement"
            ? "bg-white text-[#F43F5E] shadow-sm"
            : "text-gray-600 hover:text-[#F43F5E]"
        }`}
      >
        Établissement
      </button>
    </div>
  );
}