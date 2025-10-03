import cn from "classnames";
import { useSilo, type Silo } from "@/shell/silo";
import { useLocation } from "wouter";

export default function SiloSwitcher({ compact = false }: { compact?: boolean }) {
  const { silo, setSilo } = useSilo();
  const [, navigate] = useLocation();

  const handleSiloSwitch = (targetSilo: Silo) => {
    console.log(`🔄 [SILO-SWITCH] Switching from ${silo} to ${targetSilo}`);
    
    try {
      // Update the silo state
      setSilo(targetSilo);
      
      // Navigate to the appropriate route based on current page
      const currentPath = window.location.pathname;
      let targetRoute = '';
      
      if (targetSilo === 'slf') {
        // Switch to SLF routes
        if (currentPath.includes('/contacts')) {
          targetRoute = '/staff/slf/contacts';
        } else if (currentPath.includes('/dashboard')) {
          targetRoute = '/staff/slf/dashboard';
        } else if (currentPath.includes('/reports')) {
          targetRoute = '/staff/slf/reports';
        } else if (currentPath.includes('/settings')) {
          targetRoute = '/staff/slf/settings';
        } else if (currentPath.includes('/marketing')) {
          targetRoute = '/staff/slf/marketing';
        } else if (currentPath.includes('/lenders')) {
          targetRoute = '/staff/slf/lenders';
        } else {
          targetRoute = '/staff/slf/dashboard'; // Default SLF route
        }
      } else {
        // Switch to BF routes  
        if (currentPath.includes('/contacts')) {
          targetRoute = '/staff/contacts';
        } else if (currentPath.includes('/dashboard')) {
          targetRoute = '/staff/dashboard';
        } else if (currentPath.includes('/reports')) {
          targetRoute = '/staff/reports';
        } else if (currentPath.includes('/settings')) {
          targetRoute = '/staff/settings';
        } else if (currentPath.includes('/marketing')) {
          targetRoute = '/staff/marketing';
        } else if (currentPath.includes('/lenders')) {
          targetRoute = '/staff/lenders';
        } else {
          targetRoute = '/staff/dashboard'; // Default BF route
        }
      }
      
      console.log(`🎯 [SILO-SWITCH] Navigating from ${currentPath} to ${targetRoute}`);
      navigate(targetRoute);
    } catch (error) {
      console.error('❌ [SILO-SWITCH] Error during silo switch:', error);
    }
  };

  const Btn = ({ id, label }: { id: Silo; label: string }) => (
    <button
      onClick={() => handleSiloSwitch(id)}
      className={cn(
        "px-3 py-1 rounded text-sm border transition-colors cursor-pointer",
        silo === id 
          ? id === "slf" 
            ? "bg-blue-600 text-white border-blue-600" 
            : "bg-green-600 text-white border-green-600"
          : "bg-white hover:bg-slate-50 border-gray-300"
      )}
      type="button"
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-2 relative z-40">
      {!compact && <span className="text-sm text-slate-600">Silo:</span>}
      <Btn id="bf" label="BF" />
      <Btn id="slf" label="SLF" />
    </div>
  );
}