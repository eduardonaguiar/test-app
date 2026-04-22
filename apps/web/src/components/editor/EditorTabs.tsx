import { TabsList, TabsRoot, TabsTrigger } from '../ui/tabs';

export type EditorTabKey = 'general' | 'sections' | 'questions' | 'review';

export type EditorTabState = {
  key: EditorTabKey;
  label: string;
  state: 'complete' | 'incomplete' | 'error';
};

type EditorTabsProps = {
  activeTab: EditorTabKey;
  onChange: (tab: EditorTabKey) => void;
  items: EditorTabState[];
};

function getStateBadge(state: EditorTabState['state']): string {
  if (state === 'complete') {
    return '✓';
  }

  if (state === 'error') {
    return '✗';
  }

  return '⚠';
}

export function EditorTabs({ activeTab, onChange, items }: EditorTabsProps) {
  return (
    <TabsRoot value={activeTab} onValueChange={(value) => onChange(value as EditorTabKey)} className="editor-tabs">
      <TabsList aria-label="Blocos do editor">
        {items.map((item) => (
          <TabsTrigger key={item.key} value={item.key} className="editor-tabs__trigger">
            {item.label} <span aria-hidden="true">{getStateBadge(item.state)}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </TabsRoot>
  );
}
