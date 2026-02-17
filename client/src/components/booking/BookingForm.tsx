import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, isSameDay, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon, Users, Clock, CheckCircle2, ChevronRight, ChevronLeft, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createBooking } from "@/lib/api";

type Step = "date" | "time" | "guests" | "details" | "confirmation";

const formSchema = z.object({
  date: z.date({ required_error: "Date requise" }),
  time: z.string({ required_error: "Heure requise" }),
  guests: z.number({ required_error: "Nombre de personnes requis" }),
  children: z.number().default(0),
  email: z.string().email("Email invalide"),
  firstName: z.string().min(2, "Prénom requis"),
  lastName: z.string().min(2, "Nom requis"),
  phone: z.string().min(8, "Téléphone requis"),
  specialRequest: z.string().optional(),
  promoCode: z.string().optional(),
  newsletter: z.boolean().default(false),
});

interface BookingFormProps {
  restaurantId: number;
  minGuests?: number;
  maxGuests?: number;
}

export function BookingForm({ restaurantId, minGuests = 1, maxGuests = 12 }: BookingFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("date");
  const [direction, setDirection] = useState(1);

  // Fetch closed dates for this restaurant (public endpoint)
  const { data: closedDays = [] } = useQuery<{ id: number; date: string; service: string }[]>({
    queryKey: [`/api/public/restaurants/${restaurantId}/closed-days`],
  });

  // Fetch opening hours for this restaurant
  type DayHours = {
    isOpen: boolean;
    hasSecondService: boolean;
    openTime1: string;
    closeTime1: string;
    openTime2: string;
    closeTime2: string;
  };
  
  const { data: openingHours } = useQuery<Record<string, DayHours> | null>({
    queryKey: [`/api/public/restaurants/${restaurantId}/opening-hours`],
  });

  // Map French day names to JS getDay() values (0 = Sunday)
  const dayNameToIndex: Record<string, number> = {
    "Dimanche": 0, "Lundi": 1, "Mardi": 2, "Mercredi": 3, 
    "Jeudi": 4, "Vendredi": 5, "Samedi": 6
  };
  const indexToDayName = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  // Generate time slots based on opening hours for the selected date
  const getTimeSlotsForDate = (date: Date | undefined) => {
    if (!date || !openingHours) {
      // Default slots if no opening hours configured
      return {
        lunch: ["12:00", "12:30", "13:00", "13:30"],
        dinner: ["19:00", "19:30", "20:00", "20:30", "21:00", "21:30"]
      };
    }

    const dayName = indexToDayName[date.getDay()];
    const dayHours = openingHours[dayName];

    if (!dayHours || !dayHours.isOpen) {
      return { lunch: [], dinner: [] };
    }

    const generateSlots = (startTime: string, endTime: string) => {
      const slots: string[] = [];
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      
      let currentH = startH;
      let currentM = startM;
      
      while (currentH < endH || (currentH === endH && currentM < endM)) {
        // Only add slots up to 1 hour before closing (for reservations)
        const slotMinutes = currentH * 60 + currentM;
        const endMinutes = endH * 60 + endM;
        if (endMinutes - slotMinutes >= 60) {
          slots.push(`${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`);
        }
        
        currentM += 30;
        if (currentM >= 60) {
          currentH++;
          currentM = 0;
        }
      }
      return slots;
    };

    const lunchSlots = generateSlots(dayHours.openTime1, dayHours.closeTime1);
    const dinnerSlots = dayHours.hasSecondService 
      ? generateSlots(dayHours.openTime2, dayHours.closeTime2)
      : [];

    return { lunch: lunchSlots, dinner: dinnerSlots };
  };

  // Convert closed dates to Date objects for comparison
  const closedDates = closedDays.map(cd => parseISO(cd.date));

  const isDateClosed = (date: Date) => {
    // Check if explicitly closed
    if (closedDates.some(closedDate => isSameDay(date, closedDate))) {
      return true;
    }
    // Check if restaurant is closed on this day of week
    if (openingHours) {
      const dayName = indexToDayName[date.getDay()];
      const dayHours = openingHours[dayName];
      if (!dayHours || !dayHours.isOpen) {
        return true;
      }
    }
    return false;
  };

  // Check if a time slot is in the past (for today's bookings)
  const isTimeSlotPassed = (timeSlot: string) => {
    if (!formData.date || !isToday(formData.date)) {
      return false;
    }
    const now = new Date();
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime <= now;
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guests: 2,
      children: 0,
      newsletter: false,
    },
  });

  const { watch, setValue, handleSubmit, trigger } = form;
  const formData = watch();

  const bookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      setStep("confirmation");
      toast({
        title: "Réservation envoyée !",
        description: `Vous recevrez une confirmation dès que le restaurant aura validé votre demande.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de la réservation",
        variant: "destructive",
      });
    },
  });

  const handleNext = async (nextStep: Step) => {
    let isValid = false;
    if (step === "date") isValid = await trigger("date");
    if (step === "time") isValid = await trigger("time");
    if (step === "guests") isValid = await trigger("guests");
    
    if (isValid || step === "details") { // Details is final submit
      setDirection(1);
      setStep(nextStep);
    }
  };

  const handleBack = (prevStep: Step) => {
    setDirection(-1);
    setStep(prevStep);
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    bookingMutation.mutate({
      restaurantId,
      date: format(values.date, "yyyy-MM-dd"),
      time: values.time,
      guests: values.guests,
      children: values.children,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      specialRequest: values.specialRequest,
      newsletter: values.newsletter ? 1 : 0,
    });
  }

  // --- Step Components ---

  const ProgressBar = () => {
    const steps = [
      { id: "date", icon: CalendarIcon, label: formData.date ? format(formData.date, "d MMM", { locale: fr }) : "Date" },
      { id: "time", icon: Clock, label: formData.time || "Heure" },
      { id: "guests", icon: Users, label: formData.guests ? `${formData.guests} Pers.` : "Pers." },
    ];

    return (
      <div className="flex items-center justify-between bg-muted/30 rounded-full p-1 mb-6 border overflow-hidden">
        {steps.map((s, index) => {
          const isActive = s.id === step;
          const isCompleted = 
            (s.id === "date" && (step === "time" || step === "guests" || step === "details")) ||
            (s.id === "time" && (step === "guests" || step === "details")) ||
            (s.id === "guests" && step === "details");
          
          return (
             <button 
               key={s.id}
               onClick={() => {
                 if (isCompleted) setStep(s.id as Step);
               }}
               disabled={!isCompleted && !isActive}
               className={cn(
                 "flex items-center justify-center gap-1 h-10 px-2 sm:px-4 rounded-full text-xs sm:text-sm font-medium transition-all flex-1 min-w-0",
                 (isActive || isCompleted) ? "bg-[#00645A] text-white shadow-sm" : "text-muted-foreground",
                 !isCompleted && !isActive && "opacity-50 cursor-not-allowed"
               )}
             >
               <s.icon className="w-4 h-4 flex-shrink-0" />
               <span className="truncate">{s.label}</span>
             </button>
          );
        })}
      </div>
    );
  };

  if (step === "confirmation") {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-6 bg-white rounded-lg animate-in fade-in zoom-in-95 duration-500">
        <div className="h-20 w-20 bg-green-100 text-[#00645A] rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h3 className="text-3xl font-bold text-[#00645A]">Demande envoyée</h3>
        <div className="border p-4 rounded-lg bg-muted/20 w-full max-w-sm">
            <p className="font-medium">{format(formData.date, "EEEE d MMMM yyyy", { locale: fr })}</p>
            <p className="text-xl font-bold my-1">{formData.time}</p>
            <p>{formData.guests} Personnes{formData.children > 0 ? ` (dont ${formData.children} enfant${formData.children > 1 ? 's' : ''})` : ''}</p>
            <p className="text-sm text-muted-foreground mt-2">{formData.firstName} {formData.lastName}</p>
        </div>
        <p className="text-muted-foreground max-w-xs mx-auto text-sm">
          Votre demande a été transmise au restaurant. Vous recevrez un email de confirmation à {formData.email} dès que le restaurant aura validé votre réservation.
        </p>
        <Button 
          variant="outline" 
          onClick={() => {
            setStep("date");
            form.reset();
          }}
          className="mt-4"
        >
          Nouvelle réservation
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-1">Réservez une table</h2>
        <p className="text-sm text-muted-foreground">Gratuitement • Confirmation immédiate</p>
      </div>

      <ProgressBar />

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* STEP 1: DATE */}
          {step === "date" && (
             <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
               <h3 className="text-lg font-bold text-center mb-4">Sélectionnez une date</h3>
               <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => {
                    if (date) {
                      setValue("date", date);
                      handleNext("time");
                    }
                  }}
                  disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) || isDateClosed(date)}
                  className="rounded-xl border shadow-sm w-full max-w-sm mx-auto p-3 sm:p-6"
                  classNames={{
                    day_selected: "bg-[#00645A] text-white hover:bg-[#00645A]/90 focus:bg-[#00645A]",
                    day_today: "bg-accent text-accent-foreground font-bold",
                  }}
                />
               <p className="text-xs text-muted-foreground text-center mt-4">
                 Les offres peuvent varier durant le processus de réservation.
               </p>
             </div>
          )}

          {/* STEP 2: TIME */}
          {step === "time" && (() => {
            const timeSlots = getTimeSlotsForDate(formData.date);
            const hasLunch = timeSlots.lunch.length > 0;
            const hasDinner = timeSlots.dinner.length > 0;
            
            return (
              <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
                <h3 className="text-lg font-bold text-center">Sélectionnez une heure</h3>
                
                {!hasLunch && !hasDinner ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Aucun créneau disponible pour cette date.</p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => { setDirection(-1); setStep("date"); }}
                    >
                      Choisir une autre date
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hasLunch && (
                      <>
                        <div className="text-sm font-medium text-muted-foreground">
                          {hasDinner ? "Midi" : "Créneaux disponibles"}
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                          {timeSlots.lunch.map((t) => {
                            const isPassed = isTimeSlotPassed(t);
                            return (
                              <Button
                                key={t}
                                type="button"
                                variant="outline"
                                disabled={isPassed}
                                className={cn(
                                  "h-12 text-base hover:border-[#00645A] hover:text-[#00645A]",
                                  formData.time === t && "bg-[#00645A] text-white hover:bg-[#00645A] hover:text-white border-[#00645A]",
                                  isPassed && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => {
                                  setValue("time", t);
                                  handleNext("guests");
                                }}
                              >
                                {t}
                              </Button>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {hasDinner && (
                      <>
                        <div className="text-sm font-medium text-muted-foreground mt-6">Soir</div>
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                          {timeSlots.dinner.map((t) => {
                            const isPassed = isTimeSlotPassed(t);
                            return (
                              <Button
                                key={t}
                                type="button"
                                variant="outline"
                                disabled={isPassed}
                                className={cn(
                                  "h-12 text-base hover:border-[#00645A] hover:text-[#00645A]",
                                  formData.time === t && "bg-[#00645A] text-white hover:bg-[#00645A] hover:text-white border-[#00645A]",
                                  isPassed && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={() => {
                                  setValue("time", t);
                                  handleNext("guests");
                                }}
                              >
                                {t}
                              </Button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* STEP 3: GUESTS */}
          {step === "guests" && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-lg font-bold text-center">Nombre de personnes</h3>
              
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: maxGuests - minGuests + 1 }, (_, i) => i + minGuests).map((num) => (
                  <Button
                    key={num}
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-12 text-lg font-medium hover:border-[#00645A] hover:text-[#00645A]",
                      formData.guests === num && "bg-[#00645A] text-white hover:bg-[#00645A] hover:text-white border-[#00645A]"
                    )}
                    onClick={() => {
                      setValue("guests", num);
                    }}
                  >
                    {num}
                  </Button>
                ))}
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Dont enfants</h4>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: 5 }, (_, i) => i).map((num) => (
                    <Button
                      key={num}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-10 text-base font-medium hover:border-[#00645A] hover:text-[#00645A]",
                        formData.children === num && "bg-[#00645A] text-white hover:bg-[#00645A] hover:text-white border-[#00645A]"
                      )}
                      onClick={() => setValue("children", num)}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center pt-2">
                 <Button 
                   type="button" 
                   className="bg-[#00645A] hover:bg-[#00645A]/90 text-white px-8"
                   onClick={() => handleNext("details")}
                 >
                    Continuer
                 </Button>
              </div>
            </div>
          )}

          {/* STEP 4: DETAILS */}
          {step === "details" && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
               <div className="bg-muted/30 p-4 rounded-lg border text-center mb-6">
                 <h3 className="font-bold text-lg">RÉSERVATION</h3>
                 <div className="flex items-center justify-center gap-2 text-xs sm:text-sm mt-1 flex-wrap">
                    <span className="font-medium bg-white px-2 sm:px-3 py-1 rounded-full border shadow-sm whitespace-nowrap">
                      {formData.guests} Pers.{formData.children > 0 ? ` (${formData.children} enf.)` : ''}
                    </span>
                    <span className="font-medium bg-white px-2 sm:px-3 py-1 rounded-full border shadow-sm whitespace-nowrap">
                       {formData.date && format(formData.date, "eee d MMM", { locale: fr })}
                    </span>
                    <span className="font-medium bg-white px-2 sm:px-3 py-1 rounded-full border shadow-sm whitespace-nowrap">
                      {formData.time}
                    </span>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <FormField
                   control={form.control}
                   name="firstName"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Prénom *</FormLabel>
                       <FormControl>
                         <Input placeholder="Votre prénom" {...field} />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 <FormField
                   control={form.control}
                   name="lastName"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Nom *</FormLabel>
                       <FormControl>
                         <Input placeholder="Votre nom" {...field} />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
               </div>

               <FormField
                 control={form.control}
                 name="email"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Email *</FormLabel>
                     <FormControl>
                       <Input placeholder="Votre adresse email" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <FormField
                 control={form.control}
                 name="phone"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Téléphone *</FormLabel>
                     <FormControl>
                       <Input placeholder="+41 79 123 45 67" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <FormField
                 control={form.control}
                 name="specialRequest"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Demande spéciale (optionnel)</FormLabel>
                     <FormControl>
                       <Input placeholder="Ex : une table près de la fenêtre ?" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />

               <div className="flex items-start gap-3 pt-2">
                  <FormField
                    control={form.control}
                    name="newsletter"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-normal text-muted-foreground text-xs">
                            Je souhaite recevoir des offres et des communications par e-mail et SMS de la part du restaurant.
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
               </div>

               <Button 
                 type="submit" 
                 className="w-full h-12 text-lg font-bold bg-[#00645A] hover:bg-[#004d45] mt-4"
                 disabled={bookingMutation.isPending}
                 data-testid="button-submit-booking"
               >
                 {bookingMutation.isPending ? "Confirmation..." : "Confirmez votre réservation"}
               </Button>
               <p className="text-[10px] text-center text-muted-foreground">
                 Service gratuit. La disponibilité est confirmée immédiatement.
               </p>
            </div>
          )}

        </form>
      </Form>
    </div>
  );
}
