import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface DraggableMemberProps {
  id: string;
  nickname: string;
  onRemove?: () => void;
}

export default function DraggableMember({ id, nickname, onRemove }: DraggableMemberProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-2 rounded-lg shadow-sm flex items-center justify-between 
        ${isDragging ? 'border-2 border-green-500' : ''}`}
    >
      <div className="flex items-center">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="font-medium ml-2">{nickname}</span>
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1 text-red-600 hover:bg-red-50 rounded-full"
        >
          ×
        </button>
      )}
    </div>
  );
}