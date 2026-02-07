import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/queryClient";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Save, 
  Trash2, 
  Square, 
  Circle, 
  RectangleHorizontal, 
  DoorOpen, 
  Flower2, 
  Wine,
  Minus,
  PanelTop,
  RotateCw
} from "lucide-react";
import type { FloorPlanData, FloorPlanZone, FloorPlanTable, FloorPlanDecor } from "@shared/schema";

interface FloorPlanBuilderProps {
  restaurantId: number;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const GRID_SIZE = 20;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

function DraggableItem({ 
  item, 
  isSelected, 
  onSelect,
  onDoubleClick
}: { 
  item: FloorPlanTable | FloorPlanDecor; 
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item, isExisting: true },
  });

  const style: React.CSSProperties = {
    position: "absolute",
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px) rotate(${item.rotation}deg)` : `rotate(${item.rotation}deg)`,
    cursor: isDragging ? "grabbing" : "grab",
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : isSelected ? 50 : 1,
  };

  if (item.type === "table") {
    const table = item as FloorPlanTable;
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick?.(); }}
        className={`flex flex-col items-center justify-center text-white text-xs font-medium shadow-md transition-all
          ${table.shape === "round" ? "rounded-full" : table.shape === "rectangle" ? "rounded-lg" : "rounded-md"}
          ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""}
          bg-emerald-600 hover:bg-emerald-700`}
        data-testid={`table-${item.id}`}
      >
        <span className="font-bold">{table.name}</span>
        <span className="text-[10px] opacity-80">{table.capacity}p</span>
      </div>
    );
  }

  const decor = item as FloorPlanDecor;
  const decorStyles: Record<string, string> = {
    door: "bg-amber-700",
    plant: "bg-green-500",
    bar: "bg-purple-600",
    wall: "bg-gray-700",
    window: "bg-sky-300 border-2 border-sky-500",
  };

  const decorIcons: Record<string, React.ReactNode> = {
    door: <DoorOpen className="w-4 h-4" />,
    plant: <Flower2 className="w-4 h-4" />,
    bar: <Wine className="w-4 h-4" />,
    wall: <Minus className="w-4 h-4" />,
    window: <PanelTop className="w-4 h-4" />,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      className={`flex items-center justify-center text-white rounded shadow-md
        ${decorStyles[decor.decorType] || "bg-gray-500"}
        ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
      data-testid={`decor-${item.id}`}
    >
      {decorIcons[decor.decorType]}
    </div>
  );
}

function PaletteItem({ 
  type, 
  label, 
  icon, 
  data 
}: { 
  type: string; 
  label: string; 
  icon: React.ReactNode;
  data: Partial<FloorPlanTable | FloorPlanDecor>;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { ...data, isNew: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex flex-col items-center justify-center p-3 bg-white border rounded-lg cursor-grab hover:bg-gray-50 hover:border-gray-300 transition-all
        ${isDragging ? "opacity-50 cursor-grabbing" : ""}`}
      data-testid={`palette-${type}`}
    >
      {icon}
      <span className="text-xs mt-1 text-gray-600">{label}</span>
    </div>
  );
}

function DroppableCanvas({ 
  children, 
  onDeselect 
}: { 
  children: React.ReactNode; 
  onDeselect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div
      ref={setNodeRef}
      onClick={onDeselect}
      className={`relative border-2 rounded-lg bg-gray-100 transition-colors
        ${isOver ? "border-blue-400 bg-blue-50" : "border-gray-300"}`}
      style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundImage: `
          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
        `,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
      data-testid="floor-plan-canvas"
    >
      {children}
    </div>
  );
}

function TrashDropZone({ isActive }: { isActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "trash" });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col items-center justify-center p-3 border-2 border-dashed rounded-lg transition-all
        ${isOver ? "border-red-500 bg-red-100 scale-105" : isActive ? "border-red-300 bg-red-50" : "border-gray-300 bg-gray-50"}`}
      data-testid="trash-zone"
    >
      <Trash2 className={`w-5 h-5 ${isOver ? "text-red-600" : "text-gray-400"}`} />
      <span className={`text-xs mt-1 ${isOver ? "text-red-600" : "text-gray-500"}`}>Supprimer</span>
    </div>
  );
}

export function FloorPlanBuilder({ restaurantId }: FloorPlanBuilderProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [floorPlan, setFloorPlan] = useState<FloorPlanData>({ zones: [] });
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showAddZone, setShowAddZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState("");
  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [editingTable, setEditingTable] = useState<FloorPlanTable | null>(null);
  const [editTableName, setEditTableName] = useState("");
  const [editTableCapacity, setEditTableCapacity] = useState(4);
  const [editTableMaxCapacity, setEditTableMaxCapacity] = useState(4);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { data: savedPlan, isLoading } = useQuery({
    queryKey: [`/api/floor-plans/restaurant/${restaurantId}`],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/floor-plans/restaurant/${restaurantId}`), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load floor plan");
      return res.json() as Promise<FloorPlanData>;
    },
  });

  useEffect(() => {
    if (savedPlan) {
      setFloorPlan(savedPlan);
      if (savedPlan.zones.length > 0 && !activeZoneId) {
        setActiveZoneId(savedPlan.zones[0].id);
      }
    }
  }, [savedPlan]);

  const saveMutation = useMutation({
    mutationFn: async (plan: FloorPlanData) => {
      const res = await fetch(apiUrl(`/api/floor-plans/restaurant/${restaurantId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(plan),
      });
      if (!res.ok) throw new Error("Failed to save floor plan");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Plan de salle sauvegardé" });
      queryClient.invalidateQueries({ queryKey: [`/api/floor-plans/restaurant/${restaurantId}`] });
    },
    onError: () => {
      toast({ title: "Erreur", description: "Erreur lors de la sauvegarde", variant: "destructive" });
    },
  });

  const activeZone = floorPlan.zones.find(z => z.id === activeZoneId);
  const selectedItem = activeZone?.items.find(i => i.id === selectedItemId);

  const addZone = () => {
    if (!newZoneName.trim()) return;
    const newZone: FloorPlanZone = {
      id: generateId(),
      name: newZoneName.trim(),
      type: "indoor",
      items: [],
    };
    setFloorPlan(prev => ({ zones: [...prev.zones, newZone] }));
    setActiveZoneId(newZone.id);
    setNewZoneName("");
    setShowAddZone(false);
  };

  const deleteZone = (zoneId: string) => {
    setFloorPlan(prev => ({
      zones: prev.zones.filter(z => z.id !== zoneId),
    }));
    if (activeZoneId === zoneId) {
      setActiveZoneId(floorPlan.zones.find(z => z.id !== zoneId)?.id || null);
    }
  };

  const updateItem = (updates: Partial<FloorPlanTable> | Partial<FloorPlanDecor>) => {
    if (!activeZoneId || !selectedItemId) return;
    setFloorPlan(prev => ({
      zones: prev.zones.map(zone => 
        zone.id === activeZoneId 
          ? {
              ...zone,
              items: zone.items.map(item => 
                item.id === selectedItemId 
                  ? (item.type === "table" 
                      ? { ...item, ...updates } as FloorPlanTable 
                      : { ...item, ...updates } as FloorPlanDecor)
                  : item
              ),
            }
          : zone
      ),
    }));
  };

  const deleteSelectedItem = () => {
    if (!activeZoneId || !selectedItemId) return;
    setFloorPlan(prev => ({
      zones: prev.zones.map(zone => 
        zone.id === activeZoneId 
          ? { ...zone, items: zone.items.filter(i => i.id !== selectedItemId) }
          : zone
      ),
    }));
    setSelectedItemId(null);
  };

  const openEditTableDialog = (table: FloorPlanTable) => {
    setEditingTable(table);
    setEditTableName(table.name);
    setEditTableCapacity(table.capacity);
    setEditTableMaxCapacity(table.maxCapacity || table.capacity);
  };

  const saveTableEdit = () => {
    if (!editingTable || !activeZoneId) return;
    setFloorPlan(prev => ({
      zones: prev.zones.map(zone => 
        zone.id === activeZoneId 
          ? {
              ...zone,
              items: zone.items.map(item => 
                item.id === editingTable.id 
                  ? { ...item, name: editTableName, capacity: editTableCapacity, maxCapacity: editTableMaxCapacity } as FloorPlanTable
                  : item
              ),
            }
          : zone
      ),
    }));
    setEditingTable(null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over, delta } = event;
    setDraggedItem(null);

    if (!activeZoneId) return;

    const data = active.data.current as any;

    if (data?.isNew && over?.id === "canvas") {
      const rect = document.querySelector('[data-testid="floor-plan-canvas"]')?.getBoundingClientRect();
      if (!rect) return;
      
      const x = snapToGrid(event.activatorEvent instanceof PointerEvent 
        ? event.activatorEvent.clientX - rect.left + delta.x - 30
        : 100);
      const y = snapToGrid(event.activatorEvent instanceof PointerEvent 
        ? event.activatorEvent.clientY - rect.top + delta.y - 30
        : 100);

      if (data.type === "table") {
        const capacity = data.capacity || 4;
        const newTable: FloorPlanTable = {
          id: generateId(),
          type: "table",
          name: `T${floorPlan.zones.find(z => z.id === activeZoneId)?.items.filter(i => i.type === "table").length! + 1}`,
          capacity: capacity,
          maxCapacity: capacity,
          shape: data.shape || "square",
          x: Math.max(0, Math.min(x, CANVAS_WIDTH - 60)),
          y: Math.max(0, Math.min(y, CANVAS_HEIGHT - 60)),
          width: data.width || 60,
          height: data.height || 60,
          rotation: 0,
        };
        setFloorPlan(prev => ({
          zones: prev.zones.map(zone => 
            zone.id === activeZoneId 
              ? { ...zone, items: [...zone.items, newTable] }
              : zone
          ),
        }));
        setSelectedItemId(newTable.id);
      } else if (data.type === "decor") {
        const newDecor: FloorPlanDecor = {
          id: generateId(),
          type: "decor",
          decorType: data.decorType,
          x: Math.max(0, Math.min(x, CANVAS_WIDTH - 40)),
          y: Math.max(0, Math.min(y, CANVAS_HEIGHT - 40)),
          width: data.width || 40,
          height: data.height || 40,
          rotation: 0,
        };
        setFloorPlan(prev => ({
          zones: prev.zones.map(zone => 
            zone.id === activeZoneId 
              ? { ...zone, items: [...zone.items, newDecor] }
              : zone
          ),
        }));
        setSelectedItemId(newDecor.id);
      }
    } else if (data?.isExisting) {
      const item = data.item as FloorPlanTable | FloorPlanDecor;
      
      if (over?.id === "trash") {
        setFloorPlan(prev => ({
          zones: prev.zones.map(zone => 
            zone.id === activeZoneId 
              ? { ...zone, items: zone.items.filter(i => i.id !== item.id) }
              : zone
          ),
        }));
        setSelectedItemId(null);
        return;
      }
      
      const newX = snapToGrid(Math.max(0, Math.min(item.x + delta.x, CANVAS_WIDTH - item.width)));
      const newY = snapToGrid(Math.max(0, Math.min(item.y + delta.y, CANVAS_HEIGHT - item.height)));
      
      setFloorPlan(prev => ({
        zones: prev.zones.map(zone => 
          zone.id === activeZoneId 
            ? {
                ...zone,
                items: zone.items.map(i => 
                  i.id === item.id ? { ...i, x: newX, y: newY } : i
                ),
              }
            : zone
        ),
      }));
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Chargement...</div>;
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Plan de salle</h2>
          <Button 
            onClick={() => saveMutation.mutate(floorPlan)} 
            disabled={saveMutation.isPending}
            data-testid="save-floor-plan"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </div>

        <div className="flex gap-4">
          <Card className="w-48 shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                Zones
                <Dialog open={showAddZone} onOpenChange={setShowAddZone}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" data-testid="add-zone">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter une zone</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Nom</Label>
                        <Input 
                          value={newZoneName} 
                          onChange={e => setNewZoneName(e.target.value)}
                          placeholder="ex: Terrasse, Étage 1, Salle principale..."
                          data-testid="zone-name-input"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={addZone} data-testid="confirm-add-zone">Ajouter</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {floorPlan.zones.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-2">
                  Aucune zone. Créez-en une !
                </p>
              ) : (
                floorPlan.zones.map(zone => (
                  <div
                    key={zone.id}
                    className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors
                      ${zone.id === activeZoneId ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"}`}
                    onClick={() => { setActiveZoneId(zone.id); setSelectedItemId(null); }}
                    data-testid={`zone-${zone.id}`}
                  >
                    <span className="truncate">{zone.name}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                      onClick={(e) => { e.stopPropagation(); deleteZone(zone.id); }}
                      data-testid={`delete-zone-${zone.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex-1 space-y-4">
            {activeZone ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Éléments à glisser</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="tables">
                      <TabsList className="mb-2">
                        <TabsTrigger value="tables" className="text-xs">Tables</TabsTrigger>
                        <TabsTrigger value="decor" className="text-xs">Décoration</TabsTrigger>
                      </TabsList>
                      <TabsContent value="tables" className="mt-0">
                        <div className="flex gap-2 items-center">
                          <PaletteItem 
                            type="table-square" 
                            label="Carrée" 
                            icon={<Square className="w-5 h-5 text-emerald-600" />}
                            data={{ type: "table", shape: "square", capacity: 4, width: 60, height: 60 }}
                          />
                          <PaletteItem 
                            type="table-round" 
                            label="Ronde" 
                            icon={<Circle className="w-5 h-5 text-emerald-600" />}
                            data={{ type: "table", shape: "round", capacity: 4, width: 60, height: 60 }}
                          />
                          <PaletteItem 
                            type="table-rectangle" 
                            label="Rectangle" 
                            icon={<RectangleHorizontal className="w-5 h-5 text-emerald-600" />}
                            data={{ type: "table", shape: "rectangle", capacity: 6, width: 100, height: 60 }}
                          />
                          <div className="border-l pl-2 ml-2">
                            <TrashDropZone isActive={draggedItem?.isExisting} />
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="decor" className="mt-0">
                        <div className="flex gap-2 flex-wrap items-center">
                          <PaletteItem 
                            type="decor-door" 
                            label="Porte" 
                            icon={<DoorOpen className="w-5 h-5 text-amber-700" />}
                            data={{ type: "decor", decorType: "door", width: 60, height: 20 }}
                          />
                          <PaletteItem 
                            type="decor-plant" 
                            label="Plante" 
                            icon={<Flower2 className="w-5 h-5 text-green-500" />}
                            data={{ type: "decor", decorType: "plant", width: 30, height: 30 }}
                          />
                          <PaletteItem 
                            type="decor-bar" 
                            label="Bar" 
                            icon={<Wine className="w-5 h-5 text-purple-600" />}
                            data={{ type: "decor", decorType: "bar", width: 120, height: 40 }}
                          />
                          <PaletteItem 
                            type="decor-wall" 
                            label="Mur" 
                            icon={<Minus className="w-5 h-5 text-gray-700" />}
                            data={{ type: "decor", decorType: "wall", width: 100, height: 10 }}
                          />
                          <PaletteItem 
                            type="decor-window" 
                            label="Fenêtre" 
                            icon={<PanelTop className="w-5 h-5 text-sky-500" />}
                            data={{ type: "decor", decorType: "window", width: 80, height: 15 }}
                          />
                          <div className="border-l pl-2 ml-2">
                            <TrashDropZone isActive={draggedItem?.isExisting} />
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                <DroppableCanvas onDeselect={() => setSelectedItemId(null)}>
                  {activeZone.items.map(item => (
                    <DraggableItem 
                      key={item.id} 
                      item={item} 
                      isSelected={item.id === selectedItemId}
                      onSelect={() => setSelectedItemId(item.id)}
                      onDoubleClick={item.type === "table" ? () => openEditTableDialog(item as FloorPlanTable) : undefined}
                    />
                  ))}
                </DroppableCanvas>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg text-gray-500">
                Sélectionnez ou créez une zone pour commencer
              </div>
            )}
          </div>

          {selectedItem && (
            <Card className="w-56 shrink-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Propriétés
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    className="h-6 px-2"
                    onClick={deleteSelectedItem}
                    data-testid="delete-item"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Suppr.
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedItem.type === "table" && (
                  <>
                    <div>
                      <Label className="text-xs">Nom</Label>
                      <Input 
                        value={(selectedItem as FloorPlanTable).name}
                        onChange={e => updateItem({ name: e.target.value })}
                        className="h-8"
                        data-testid="item-name"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Capacité</Label>
                      <Input 
                        type="number"
                        value={(selectedItem as FloorPlanTable).capacity}
                        onChange={e => updateItem({ capacity: parseInt(e.target.value) || 1 })}
                        className="h-8"
                        min={1}
                        max={20}
                        data-testid="item-capacity"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Forme</Label>
                      <Select 
                        value={(selectedItem as FloorPlanTable).shape}
                        onValueChange={(v: any) => updateItem({ shape: v })}
                      >
                        <SelectTrigger className="h-8" data-testid="item-shape">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="square">Carrée</SelectItem>
                          <SelectItem value="round">Ronde</SelectItem>
                          <SelectItem value="rectangle">Rectangle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Largeur</Label>
                    <Input 
                      type="number"
                      value={selectedItem.width}
                      onChange={e => updateItem({ width: parseInt(e.target.value) || 20 })}
                      className="h-8"
                      min={20}
                      max={200}
                      data-testid="item-width"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Hauteur</Label>
                    <Input 
                      type="number"
                      value={selectedItem.height}
                      onChange={e => updateItem({ height: parseInt(e.target.value) || 20 })}
                      className="h-8"
                      min={20}
                      max={200}
                      data-testid="item-height"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Rotation</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="number"
                      value={selectedItem.rotation}
                      onChange={e => updateItem({ rotation: parseInt(e.target.value) || 0 })}
                      className="h-8 flex-1"
                      min={0}
                      max={359}
                      step={15}
                      data-testid="item-rotation"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() => updateItem({ rotation: (selectedItem.rotation + 45) % 360 })}
                      data-testid="rotate-item"
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DragOverlay>
        {draggedItem?.isNew && (
          <div className="w-16 h-16 bg-emerald-500 rounded opacity-80 flex items-center justify-center text-white">
            {draggedItem.type === "table" ? (
              draggedItem.shape === "round" ? <Circle /> : 
              draggedItem.shape === "rectangle" ? <RectangleHorizontal /> : <Square />
            ) : (
              draggedItem.decorType === "door" ? <DoorOpen /> :
              draggedItem.decorType === "plant" ? <Flower2 /> :
              draggedItem.decorType === "bar" ? <Wine /> :
              draggedItem.decorType === "wall" ? <Minus /> : <PanelTop />
            )}
          </div>
        )}
      </DragOverlay>

      <Dialog open={!!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Numéro / Nom de la table</Label>
              <Input 
                value={editTableName} 
                onChange={e => setEditTableName(e.target.value)}
                placeholder="ex: T1, Table 5..."
                data-testid="edit-table-name"
              />
            </div>
            <div>
              <Label>Nombre de couverts</Label>
              <Input 
                type="number"
                value={editTableCapacity} 
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setEditTableCapacity(val);
                  if (editTableMaxCapacity < val) setEditTableMaxCapacity(val);
                }}
                min={1}
                max={20}
                data-testid="edit-table-capacity"
              />
            </div>
            <div>
              <Label>Nombre de couverts max</Label>
              <Input 
                type="number"
                value={editTableMaxCapacity} 
                onChange={e => setEditTableMaxCapacity(Math.max(editTableCapacity, parseInt(e.target.value) || 1))}
                min={editTableCapacity}
                max={30}
                data-testid="edit-table-max-capacity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTable(null)}>Annuler</Button>
            <Button onClick={saveTableEdit} data-testid="save-table-edit">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
