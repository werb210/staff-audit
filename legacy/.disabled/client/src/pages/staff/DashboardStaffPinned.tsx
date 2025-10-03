import React from "react";
const Tab = ({href,children}:{href:string;children:React.ReactNode}) =>
  <a href={href} className="inline-flex items-center px-3 py-2 rounded-md hover:bg-gray-100 text-sm">{children}</a>;

export default function DashboardStaffPinned(){
  return (
    <div className="p-4">
      <nav className="flex gap-2 mb-4">
        <Tab href="/pipeline">Sales Pipeline</Tab>
        <Tab href="/contacts">Contacts</Tab>
        <Tab href="/marketing">Marketing</Tab>
        <Tab href="/lenders">Lenders</Tab>
        <Tab href="/comms">Communications</Tab>
        <Tab href="/settings">Settings</Tab>
      </nav>
      <div className="text-sm text-gray-600">
        Staff dashboard shell loaded. (Content temporarily minimal to isolate crash.)
      </div>
    </div>
  );
}