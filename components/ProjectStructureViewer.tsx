import React from 'react';
import { PROJECT_STRUCTURE_TREE } from '../constants';
import { Folder, FileText, ChevronRight, ChevronDown } from 'lucide-react';

interface FileTreeItemProps {
  item: any;
  depth?: number;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ item, depth = 0 }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  
  if (!item) return null;
  
  const isFolder = item.type === 'folder';

  return (
    <div className="select-none">
      <div 
        className="flex items-center py-1 hover:bg-slate-800 rounded cursor-pointer transition-colors"
        style={{ paddingLeft: `${depth * 20}px` }}
        onClick={() => isFolder && setIsOpen(!isOpen)}
      >
        <span className="mr-1 text-slate-500">
          {isFolder ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : <div className="w-3.5" />}
        </span>
        <span className={`mr-2 ${isFolder ? 'text-amber-400' : 'text-blue-400'}`}>
          {isFolder ? <Folder size={16} /> : <FileText size={16} />}
        </span>
        <span className={`text-sm ${isFolder ? 'font-semibold text-slate-200' : 'text-slate-400'}`}>
          {item.name}
        </span>
      </div>
      {isFolder && isOpen && Array.isArray(item.children) && (
        <div>
          {item.children.map((child: any, idx: number) => (
            <FileTreeItem key={idx} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ProjectStructureViewer: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 h-full overflow-auto">
      <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Project Structure</h3>
      <FileTreeItem item={PROJECT_STRUCTURE_TREE} />
    </div>
  );
};