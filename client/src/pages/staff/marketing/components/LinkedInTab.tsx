import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import LinkedInSequenceBuilder from './LinkedInSequenceBuilder';
import LinkedInSequenceReports from './LinkedInSequenceReports';
import { PenTool, BarChart3 } from 'lucide-react';

export default function LinkedInTab() {
  return (
    <Tabs defaultValue="builder" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="builder" className="flex items-center gap-2">
          <PenTool className="h-4 w-4" />
          Sequence Builder
        </TabsTrigger>
        <TabsTrigger value="reports" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Sequence Reports
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="builder" className="mt-6">
        <LinkedInSequenceBuilder />
      </TabsContent>
      
      <TabsContent value="reports" className="mt-6">
        <LinkedInSequenceReports />
      </TabsContent>
    </Tabs>
  );
}