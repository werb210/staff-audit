import React from 'react';
import SiloSwitcher from '@/components/layout/SiloSwitcher';

export default function SLFCommunicationPage() {
  
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-600">
            🔵 SLF (Site Level Financial) - COMMUNICATIONS
          </h2>
          <SiloSwitcher />
        </div>
      </div>
      
      <div className="p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">SLF Communications Center</h3>
          <p className="text-blue-600">
            Site Level Financial communication hub for voice, SMS, and email.
            Completely independent from Boreal Financial (BF) communications.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 text-xl">📞</span>
              </div>
              <h4 className="text-lg font-semibold text-blue-700">Voice Calls</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">Active Calls</span>
                <span className="font-semibold text-blue-800">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Today's Calls</span>
                <span className="font-semibold text-blue-800">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Call Quality</span>
                <span className="font-semibold text-green-600">Excellent</span>
              </div>
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
              Make Call
            </button>
          </div>
          
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 text-xl">💬</span>
              </div>
              <h4 className="text-lg font-semibold text-blue-700">SMS Messages</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">Unread</span>
                <span className="font-semibold text-blue-800">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Sent Today</span>
                <span className="font-semibold text-blue-800">24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Templates</span>
                <span className="font-semibold text-blue-800">8</span>
              </div>
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
              Send SMS
            </button>
          </div>
          
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 text-xl">✉️</span>
              </div>
              <h4 className="text-lg font-semibold text-blue-700">Email</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">Inbox</span>
                <span className="font-semibold text-blue-800">7</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Sent Today</span>
                <span className="font-semibold text-blue-800">15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Drafts</span>
                <span className="font-semibold text-blue-800">2</span>
              </div>
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
              Compose Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}