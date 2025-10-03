export const NAV_BF = [
  { to:"/staff/pipeline", label:"Pipeline" },
  { to:"/staff/contacts", label:"Contacts" },
  { 
    to:"/staff/communication", 
    label:"Communications",
    submenu: [
      { to:"/staff/communication/chat", label:"Chat" },
      { to:"/staff/communication/email", label:"Email" },
      { to:"/staff/communication/calls", label:"Call Logs" },
      { to:"/staff/support-queue", label:"Support Queue" }
    ]
  },
  { to:"/staff/tasks-calendar", label:"Tasks & Calendar" },
  { to:"/staff/reports", label:"Reports" },
  { to:"/staff/marketing", label:"Marketing" },
  { 
    to:"/staff/lenders", 
    label:"Lenders",
    submenu: [
      { to:"/staff/lenders", label:"Lenders Management" },
      { to:"/staff/lenders/v1", label:"V1 Products Catalog" }
    ]
  },
  { to:"/staff/settings", label:"Settings" },
  ...(process.env.NODE_ENV === 'development' ? [{ to:"/staff/dev/features", label:"🔧 Features" }] : [])
];

export const NAV_SLF = [
  { to:"/staff/slf/contacts", label:"Contacts" },
  { to:"/staff/slf/reports", label:"Reports" },
  { to:"/staff/slf/settings", label:"Settings" }
];

// Legacy export for compatibility
export const bfNav = NAV_BF;