import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentFolder } from "@/hooks/useDocuments";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
    Calendar,
    FileText,
    FolderInput,
    Hash,
    Plus,
    RefreshCw,
    Shield,
    Trash2,
    User,
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type ConfidentialityLevel = "public" | "internal" | "confidential" | "restricted";

export interface CustomField {
  id: string;
  name: string;
  value: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
}

export interface DocumentMetadata {
  title: string;
  description?: string;
  documentNumber?: string;
  expiryDate?: Date;
  confidentiality: ConfidentialityLevel;
  ownerId: string;
  folderId?: string | null;
  tags?: string[];
  customFields?: CustomField[];
}

interface DocumentMetadataFormProps {
  metadata: DocumentMetadata;
  onChange: (metadata: DocumentMetadata) => void;
  folders?: DocumentFolder[];
  owners?: Array<{ id: string; name: string; avatar?: string }>;
  documentNumberPrefix?: string;
  autoGenerateNumber?: boolean;
  onAutoGenerateToggle?: (enabled: boolean) => void;
  readOnly?: boolean;
  className?: string;
}

const EMPTY_FOLDERS: DocumentFolder[] = [];
const EMPTY_OWNERS: Array<{ id: string; name: string; avatar?: string }> = [];

const CONFIDENTIALITY_LEVELS: Array<{
  value: ConfidentialityLevel;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}> = [
    {
      value: "public",
      label: "Public",
      description: "Accessible to everyone including guests",
      color: "text-gray-700",
      bgColor: "bg-gray-100",
    },
    {
      value: "internal",
      label: "Internal",
      description: "Accessible to all staff and management",
      color: "text-blue-700",
      bgColor: "bg-blue-100",
    },
    {
      value: "confidential",
      label: "Confidential",
      description: "Accessible to management level only",
      color: "text-orange-700",
      bgColor: "bg-orange-100",
    },
    {
      value: "restricted",
      label: "Restricted",
      description: "Accessible to authorized personnel only",
      color: "text-red-700",
      bgColor: "bg-red-100",
    },
  ];

function generateDocumentNumber(prefix: string = "DOC"): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().split('-')[0].toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function flattenFolders(folders: DocumentFolder[]): Array<DocumentFolder & { level: number }> {
  const result: Array<DocumentFolder & { level: number }> = [];
  const traverse = (items: DocumentFolder[], level: number) => {
    for (const item of items) {
      result.push({ ...item, level });
      if (item.children && item.children.length > 0) {
        traverse(item.children, level + 1);
      }
    }
  };
  traverse(folders, 0);
  return result;
}

export function DocumentMetadataForm({
  metadata,
  onChange,
  folders = EMPTY_FOLDERS,
  owners = EMPTY_OWNERS,
  documentNumberPrefix = "DOC",
  autoGenerateNumber = false,
  onAutoGenerateToggle,
  readOnly = false,
  className,
}: DocumentMetadataFormProps) {
  const { t } = useTranslation();
  const [customFields, setCustomFields] = React.useState<CustomField[]>(
    metadata.customFields || []
  );
  const [newFieldName, setNewFieldName] = React.useState("");
  const [newFieldType, setNewFieldType] = React.useState<CustomField["type"]>("text");
  const [showAddField, setShowAddField] = React.useState(false);

  const flatFolders = flattenFolders(folders);

  const updateMetadata = <K extends keyof DocumentMetadata>(
    key: K,
    value: DocumentMetadata[K]
  ) => {
    onChange({ ...metadata, [key]: value });
  };

  const handleAutoGenerate = () => {
    const newNumber = generateDocumentNumber(documentNumberPrefix);
    updateMetadata("documentNumber", newNumber);
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      name: newFieldName.trim(),
      value: "",
      type: newFieldType,
    };
    const updatedFields = [...customFields, newField];
    setCustomFields(updatedFields);
    updateMetadata("customFields", updatedFields);
    setNewFieldName("");
    setShowAddField(false);
  };

  const updateCustomField = (id: string, value: string) => {
    const updatedFields = customFields.map((field) =>
      field.id === id ? { ...field, value } : field
    );
    setCustomFields(updatedFields);
    updateMetadata("customFields", updatedFields);
  };

  const removeCustomField = (id: string) => {
    const updatedFields = customFields.filter((field) => field.id !== id);
    setCustomFields(updatedFields);
    updateMetadata("customFields", updatedFields);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title" className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Document Title *
        </Label>
        <Input
          id="title"
          value={metadata.title}
          onChange={(e) => updateMetadata("title", e.target.value)}
          placeholder="Enter document title"
          disabled={readOnly}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t('common:description')}</Label>
        <Textarea
          id="description"
          value={metadata.description || ""}
          onChange={(e) => updateMetadata("description", e.target.value)}
          placeholder="Enter document description (optional)"
          rows={3}
          disabled={readOnly}
        />
      </div>

      {/* Document Number */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="documentNumber" className="flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Document Number
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Auto-generate</span>
            <Switch
              checked={autoGenerateNumber}
              onCheckedChange={onAutoGenerateToggle}
              disabled={readOnly}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Input
            id="documentNumber"
            value={metadata.documentNumber || ""}
            onChange={(e) => updateMetadata("documentNumber", e.target.value)}
            placeholder={autoGenerateNumber ? "Will be auto-generated" : "Enter document number"}
            disabled={readOnly || autoGenerateNumber}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleAutoGenerate}
            disabled={readOnly || autoGenerateNumber}
            title="Generate new number"
            aria-label={t('accessibility.generate_document_number', 'Generate document number')}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          A unique identifier for this document. Leave blank to auto-generate.
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expiry Date */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Expiry Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
                disabled={readOnly}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {metadata.expiryDate ? (
                  format(metadata.expiryDate, "PPP")
                ) : (
                  <span className="text-muted-foreground">No expiry date</span>
                )}
              </Button>
            </PopoverTrigger>
            {!readOnly && (
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={metadata.expiryDate}
                  onSelect={(date) => updateMetadata("expiryDate", date)}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
                {metadata.expiryDate && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => updateMetadata("expiryDate", undefined)}
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            )}
          </Popover>
        </div>

        {/* Owner */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Owner *
          </Label>
          <Select
            value={metadata.ownerId}
            onValueChange={(value) => updateMetadata("ownerId", value)}
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select owner" />
            </SelectTrigger>
            <SelectContent>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Confidentiality Level */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Confidentiality Level *
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONFIDENTIALITY_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              onClick={() => updateMetadata("confidentiality", level.value)}
              disabled={readOnly}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all",
                metadata.confidentiality === level.value
                  ? "border-[#0B1C3E] bg-[#0B1C3E]/5"
                  : "border-border hover:border-muted-foreground/50",
                readOnly && "cursor-not-allowed opacity-60"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center",
                  metadata.confidentiality === level.value
                    ? "border-[#0B1C3E] bg-[#0B1C3E]"
                    : "border-muted-foreground"
                )}
              >
                {metadata.confidentiality === level.value && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge className={cn(level.bgColor, level.color, "border-0")}>
                    {level.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {level.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Folder Selection */}
      {folders.length > 0 && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <FolderInput className="w-4 h-4" />
            Folder
          </Label>
          <Select
            value={metadata.folderId || "root"}
            onValueChange={(value) =>
              updateMetadata("folderId", value === "root" ? null : value)
            }
            disabled={readOnly}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="root">All Documents (No folder)</SelectItem>
              {flatFolders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {"\u00A0".repeat(folder.level * 2)}
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Custom Fields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Custom Fields</Label>
          {!readOnly && !showAddField && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => setShowAddField(true)}
            >
              <Plus className="w-4 h-4" />
              Add Field
            </Button>
          )}
        </div>

        {/* Existing Custom Fields */}
        {customFields.length > 0 && (
          <div className="space-y-2">
            {customFields.map((field) => (
              <div key={field.id} className="flex items-start gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1">
                    {field.name}
                  </Label>
                  {field.type === "select" && field.options ? (
                    <Select
                      value={field.value}
                      onValueChange={(value) => updateCustomField(field.id, value)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "date" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-9"
                          disabled={readOnly}
                        >
                          {field.value ? format(new Date(field.value), "PP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) =>
                            updateCustomField(field.id, date?.toISOString() || "")
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Input
                      type={field.type}
                      value={field.value}
                      onChange={(e) => updateCustomField(field.id, e.target.value)}
                      disabled={readOnly}
                      className="h-9"
                    />
                  )}
                </div>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 mt-5"
                    onClick={() => removeCustomField(field.id)}
                    aria-label={t('accessibility.remove_custom_field', 'Remove custom field')}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add New Field */}
        {showAddField && !readOnly && (
          <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs mb-1">Field Name</Label>
                <Input
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="e.g., Department, Project Code"
                  onKeyDown={(e) => e.key === "Enter" && addCustomField()}
                />
              </div>
              <div>
                <Label className="text-xs mb-1">{t('common:type')}</Label>
                <Select
                  value={newFieldType}
                  onValueChange={(v) => setNewFieldType(v as CustomField["type"])}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="date">{t('common:date')}</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowAddField(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1 bg-[#0B1C3E] hover:bg-[#1a3a6e]"
                onClick={addCustomField}
                disabled={!newFieldName.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Field
              </Button>
            </div>
          </div>
        )}

        {customFields.length === 0 && !showAddField && (
          <p className="text-sm text-muted-foreground">
            No custom fields. Add fields to track additional information.
          </p>
        )}
      </div>
    </div>
  );
}
