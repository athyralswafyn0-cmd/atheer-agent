'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronDown, Bot, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Bot {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export function BotSelector() {
  const [open, setOpen] = useState(false);

  const bots: Bot[] = [
    { id: '1', name: 'مكتب الدعم - المطعم', status: 'active' },
    { id: '2', name: 'مساعد الحجوزات - الفندق', status: 'active' },
    { id: '3', name: 'خدمة العملاء - العيادة', status: 'inactive' },
  ];

  return (
    <div className="relative">
      <Button variant="outline" className="gap-2" onClick={() => setOpen(!open)}>
        <Bot className="h-4 w-4" />
        <span className="hidden sm:inline">مكتب الدعم - المطعم</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fade-in">
          {bots.map((bot) => (
            <button
              key={bot.id}
              className={cn('w-full px-4 py-2 text-right hover:bg-gray-100 flex items-center gap-2', bot.status === 'active' && 'text-primary')}
            >
              <span className={cn('w-2 h-2 rounded-full', bot.status === 'active' ? 'bg-green-500' : 'bg-gray-400')} />
              <span className="text-sm font-medium">{bot.name}</span>
            </button>
          ))}
          <hr className="my-1 border-gray-200" />
          <Link href="/dashboard/bots/new">
            <Button variant="ghost" className="w-full justify-between px-4 py-2 text-sm">
              <Plus className="h-4 w-4" />
              <span>مساعد جديد</span>
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}