import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon } from 'lucide-react';

export function Settings({ apiKeys, onUpdateApiKeys }) {
  const [keys, setKeys] = useState(apiKeys);

  const handleSave = () => {
    onUpdateApiKeys(keys);
    // Save to localStorage or your backend
    localStorage.setItem('apiKeys', JSON.stringify(keys));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <SettingsIcon className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>API Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label>OpenAI API Key</label>
            <Input
              type="password"
              value={keys.openai}
              onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
            />
          </div>
          <div>
            <label>Anthropic API Key</label>
            <Input
              type="password"
              value={keys.anthropic}
              onChange={(e) => setKeys({ ...keys, anthropic: e.target.value })}
            />
          </div>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 