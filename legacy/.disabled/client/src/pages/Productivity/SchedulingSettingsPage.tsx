import React from "react";

export default function SchedulingSettingsPage(){
  const [settings, setSettings] = React.useState({
    time_zone: 'America/Edmonton',
    slot_minutes: 30,
    buffer_before: 10,
    buffer_after: 10,
    workdays: [1,2,3,4,5],
    start_hour: 9,
    end_hour: 17
  });

  async function load(){
    const j = await (await fetch("/api/scheduling/settings")).json();
    if(j.settings) setSettings(j.settings);
  }

  React.useEffect(()=>{ load(); },[]);

  async function save(){
    await fetch("/api/scheduling/settings", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(settings)
    });
    alert("Settings saved!");
  }

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-4 space-y-4">
      <div className="text-lg font-semibold">Scheduling Settings</div>
      
      <div className="border rounded p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Time Zone</label>
          <select 
            className="border rounded px-2 py-1 w-full"
            value={settings.time_zone}
            onChange={e => updateSetting('time_zone', e.target.value)}
          >
            <option value="America/Edmonton">America/Edmonton</option>
            <option value="America/Toronto">America/Toronto</option>
            <option value="America/Vancouver">America/Vancouver</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Slot Duration (min)</label>
            <input 
              type="number" 
              className="border rounded px-2 py-1 w-full"
              value={settings.slot_minutes}
              onChange={e => updateSetting('slot_minutes', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Buffer Before (min)</label>
            <input 
              type="number" 
              className="border rounded px-2 py-1 w-full"
              value={settings.buffer_before}
              onChange={e => updateSetting('buffer_before', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Buffer After (min)</label>
            <input 
              type="number" 
              className="border rounded px-2 py-1 w-full"
              value={settings.buffer_after}
              onChange={e => updateSetting('buffer_after', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Start Hour (24h)</label>
            <input 
              type="number" 
              min="0" 
              max="23"
              className="border rounded px-2 py-1 w-full"
              value={settings.start_hour}
              onChange={e => updateSetting('start_hour', parseInt(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Hour (24h)</label>
            <input 
              type="number" 
              min="1" 
              max="24"
              className="border rounded px-2 py-1 w-full"
              value={settings.end_hour}
              onChange={e => updateSetting('end_hour', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Work Days</label>
          <div className="flex gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
              <label key={day} className="flex items-center space-x-1">
                <input 
                  type="checkbox" 
                  checked={settings.workdays.includes(idx + 1)}
                  onChange={e => {
                    const newWorkdays = e.target.checked 
                      ? [...settings.workdays, idx + 1]
                      : settings.workdays.filter(d => d !== idx + 1);
                    updateSetting('workdays', newWorkdays.sort());
                  }}
                />
                <span className="text-sm">{day}</span>
              </label>
            ))}
          </div>
        </div>

        <button 
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={save}
        >
          Save Settings
        </button>
      </div>

      <div className="border rounded p-3 bg-gray-50">
        <div className="text-sm font-medium mb-2">Public Booking Link</div>
        <div className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
          {window.location.origin}/public/schedule?user=YOUR_USER_ID
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Share this link for clients to book meetings with you.
        </div>
      </div>
    </div>
  );
}