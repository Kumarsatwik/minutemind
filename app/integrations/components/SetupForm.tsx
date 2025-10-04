import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React, { useState } from "react";

interface SetupItem {
  id?: string;
  key?: string;
  gid?: string;
  name: string;
}

interface SetupData {
  boards?: SetupItem[];
  channels?: SetupItem[];
  projects?: SetupItem[];
  workspaceId?: string;
}

interface SetupFormProps {
  platform: string;
  data: SetupData;
  onSubmit: (platform: string, config: Record<string, unknown>) => void;
  onCancel: () => void;
  loading: boolean;
}

function SetupForm({
  platform,
  data,
  onSubmit,
  onCancel,
  loading,
}: SetupFormProps) {
  const [selectedId, setSelectedId] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [createNew, setCreateNew] = useState(false);
  const [newName, setNewName] = useState("");

  const items =
    platform === "trello"
      ? data?.boards
      : platform === "slack"
      ? data?.channels
      : data?.projects;

  const itemLabel =
    platform === "trello"
      ? "board"
      : platform === "slack"
      ? "channel"
      : "project";

  const handleSubmit = () => {
    if (createNew) {
      onSubmit(platform, {
        createNew: true,
        [`${itemLabel}Name`]: newName,
        workspaceId: data?.workspaceId,
      });
    } else {
      onSubmit(platform, {
        [`${itemLabel}Id`]: selectedId,
        [`${itemLabel}Name`]: selectedName,
        projectKey: selectedId,
        workspaceId: data?.workspaceId,
      });
    }
  };
  return (
    <div>
      <div className="mb-4">
        <Label className="block text-sm font-medium text-foreground mb-2">
          Select {itemLabel} for action items:
        </Label>

        {!createNew ? (
          <Select
            value={selectedId}
            onValueChange={(value) => {
              const selected = items?.find(
                (item: SetupItem) =>
                  item.id === value || item.key === value || item.gid === value
              );
              setSelectedId(value);
              setSelectedName(selected?.name || "");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={`choose exsisting ${itemLabel}...`} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>
                  {itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)}s
                </SelectLabel>
                {items?.map((item: SetupItem) => {
                  const itemValue = item.id || item.key || item.gid || "";
                  return (
                    <SelectItem key={itemValue} value={itemValue}>
                      {item.name}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        ) : (
          <Input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Enter new ${itemLabel} name...`}
          />
        )}
      </div>
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Checkbox
            id="create-new"
            checked={createNew}
            onCheckedChange={(checked) => setCreateNew(!!checked)}
          />

          <Label htmlFor="create-new">Create new {itemLabel}</Label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1 cursor-pointer"
          type="button"
        >
          Cancel
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={
            loading || (!createNew && !selectedId) || (createNew && !newName)
          }
          className="flex-1 cursor-pointer"
          type="button"
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default SetupForm;
