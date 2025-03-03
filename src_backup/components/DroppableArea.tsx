import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DraggableMember from './DraggableMember';
import { UserCheck, UserX, UserMinus } from 'lucide-react';

interface Member {
  id: string;
  nickname: string;
}

interface DroppableAreaProps {
  id: string;
  title: string;
  icon: 'confirmed' | 'declined' | 'pending';
  members: Member[];
  onRemoveMember?: (memberId: string) => void;
}

export default function DroppableArea({ id, title, icon, members, onRemoveMember }: DroppableAreaProps) {
  const { setNodeRef } = useDroppable({ id });

  const getIcon = () => {
    switch (icon) {
      case 'confirmed':
        return <UserCheck className="w-5 h-5 text-green-600 mr-2" />;
      case 'declined':
        return <UserX className="w-5 h-5 text-red-600 mr-2" />;
      case 'pending':
        return <UserMinus className="w-5 h-5 text-gray-600 mr-2" />;
    }
  };

  const getBgColor = () => {
    switch (icon) {
      case 'confirmed':
        return 'bg-green-50';
      case 'declined':
        return 'bg-red-50';
      case 'pending':
        return 'bg-gray-50';
    }
  };

  const getTitleColor = () => {
    switch (icon) {
      case 'confirmed':
        return 'text-green-800';
      case 'declined':
        return 'text-red-800';
      case 'pending':
        return 'text-gray-800';
    }
  };

  return (
    <div className={`${getBgColor()} rounded-lg p-4`}>
      <div className="flex items-center mb-3">
        {getIcon()}
        <h3 className={`font-semibold ${getTitleColor()}`}>
          {title} ({members.length})
        </h3>
      </div>
      <div ref={setNodeRef} className="space-y-2 min-h-[100px]">
        <SortableContext items={members.map(m => m.id)} strategy={verticalListSortingStrategy}>
          {members.map((member) => (
            <DraggableMember
              key={member.id}
              id={member.id}
              nickname={member.nickname}
              onRemove={onRemoveMember ? () => onRemoveMember(member.id) : undefined}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}