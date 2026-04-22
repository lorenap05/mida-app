import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Settings, HelpCircle, LogOut, Trash2, Pencil, Check, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import MidaLogo from "@/assets/Mida_logo.svg";
import { loadUserData, saveUserData } from "@/lib/userStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SEX_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const MARITAL_OPTIONS = ["Single", "Married", "Divorced", "Widowed"];
const CHILDREN_OPTIONS = ["0", "1", "2", "3+"];
const EDUCATION_OPTIONS = ["High School", "Bachelor's", "Master's", "PhD"];
const EMPLOYMENT_OPTIONS = ["Employee (fixed salary)", "Self-employed / Freelancer", "Business owner", "Retired", "Other"];

const Profile = () => {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(loadUserData());
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState({ ...profileData });
  const [confirmReset, setConfirmReset] = useState(false);

  const handleEditStart = () => {
    setEditDraft({ ...profileData });
    setIsEditing(true);
  };

  const handleSave = () => {
    saveUserData(editDraft);
    setProfileData({ ...profileData, ...editDraft });
    setIsEditing(false);
    toast.success("Profile updated!");
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleReset = () => {
    localStorage.removeItem("mida_user_data");
    localStorage.removeItem("mida_actual_month");
    localStorage.removeItem("mida_forecast_adjustments");
    toast.success("All data cleared!");
    navigate("/chat");
    window.location.reload();
  };

  const set = (key: string, val: string) =>
    setEditDraft((prev) => ({ ...prev, [key]: val }));

  const SelectField = ({ field, options }: { field: string; options: string[] }) => (
    <Select value={(editDraft as any)[field] || ""} onValueChange={(v) => set(field, v)}>
      <SelectTrigger className="h-8 text-sm mt-1">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const fields: { label: string; key: string; type: "text" | "number" | "select"; options?: string[] }[] = [
    { label: "Name", key: "name", type: "text" },
    { label: "Age", key: "age", type: "number" },
    { label: "Occupation", key: "occupation", type: "text" },
    { label: "Employment Status", key: "employment", type: "select", options: EMPLOYMENT_OPTIONS },
    { label: "Gender", key: "sex", type: "select", options: SEX_OPTIONS },
    { label: "Marital Status", key: "marital", type: "select", options: MARITAL_OPTIONS },
    { label: "Children", key: "children", type: "select", options: CHILDREN_OPTIONS },
    { label: "Education", key: "education", type: "select", options: EDUCATION_OPTIONS },
  ];

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24">
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <img src={MidaLogo} alt="Mida" className="h-8 w-auto" />
        </div>

        {/* Avatar card */}
        <Card className="p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{profileData.name || "User"}</p>
            <p className="text-sm text-muted-foreground">{profileData.occupation || "Self-employed"}</p>
          </div>
        </Card>

        {/* Personal information — editable */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
            {isEditing ? (
              <div className="flex gap-2">
                <button onClick={handleSave} className="text-primary hover:text-primary/80 transition-colors">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={handleEditStart} className="text-muted-foreground hover:text-primary transition-colors">
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="grid grid-cols-2 gap-3">
              {fields.map(({ label, key, type, options }) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {type === "select" && options ? (
                    <SelectField field={key} options={options} />
                  ) : (
                    <Input
                      value={(editDraft as any)[key] || ""}
                      onChange={(e) => set(key, e.target.value)}
                      className="h-8 text-sm mt-1"
                      inputMode={type === "number" ? "numeric" : "text"}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {fields
                .filter(({ key }) => (profileData as any)[key])
                .map(({ label, key }) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-foreground">{(profileData as any)[key]}</p>
                  </div>
                ))}
              {fields.filter(({ key }) => (profileData as any)[key]).length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2">
                  Tap the pencil icon to fill in your details.
                </p>
              )}
            </div>
          )}

          {profileData.goals && !isEditing && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">My goal</p>
              <p className="text-sm font-medium text-foreground">{profileData.goals}</p>
            </div>
          )}
        </Card>

        {/* Settings + actions */}
        <div className="space-y-2">
          {[
            { icon: Settings, label: "Settings" },
            { icon: HelpCircle, label: "Help & Support" },
            { icon: LogOut, label: "Log Out" },
          ].map((item) => (
            <Card
              key={item.label}
              className="p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <item.icon className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{item.label}</span>
            </Card>
          ))}
        </div>

        {confirmReset ? (
          <Card className="p-4 space-y-3 border-destructive/40">
            <p className="text-sm font-medium text-foreground">
              Are you sure? This will permanently delete all your data and cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1 gap-2" onClick={handleReset}>
                <Trash2 className="w-4 h-4" />
                Yes, delete everything
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : (
          <Button variant="destructive" className="w-full gap-2" onClick={() => setConfirmReset(true)}>
            <Trash2 className="w-4 h-4" />
            Reset All Data
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center pt-4">
          Mida v1.0 · I may refine this forecast as I learn more from your feedback.
        </p>
      </div>
    </div>
  );
};

export default Profile;
