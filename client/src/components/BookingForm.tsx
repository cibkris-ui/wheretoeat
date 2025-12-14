import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
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
import { useMutation } from "@tanstack/react-query";
import { createBooking } from "@/lib/api";

type Step = "date" | "time" | "guests" | "details" | "confirmation";

const formSchema = z.object({
  date: z.date({ required_error: "Date requise" }),
  time: z.string({ required_error: "Heure requise" }),
  guests: z.number({ required_error: "Nombre de personnes requis" }),
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
}

export function BookingForm({ restaurantId }: BookingFormProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("date");
  const [direction, setDirection] = useState(1);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      guests: 2,
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
        title: "Réservation confirmée !",
        description: `Un email a été envoyé à ${formData.email}`,
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
      { id: "promos", icon: Percent, label: "" } // Placeholder for promo step visual
    ];

    return (
      <div className="flex items-center justify-between bg-muted/30 rounded-full p-1 mb-6 border">
        {steps.map((s, index) => {
          const isActive = s.id === step;
          const isCompleted = 
            (s.id === "date" && (step === "time" || step === "guests" || step === "details")) ||
            (s.id === "time" && (step === "guests" || step === "details")) ||
            (s.id === "guests" && step === "details");

          // Determine styling based on state
          let baseClass = "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300";
          if (isActive || isCompleted) {
            baseClass += " bg-[#00645A] text-white shadow-md";
          } else {
            baseClass += " text-muted-foreground hover:bg-muted";
          }

          // Special logic for the progress bar look from screenshot
          // The screenshots show a distinct "Segmented Control" look. 
          // Let's approximate it.
          
          return (
             <button 
               key={s.id}
               onClick={() => {
                 // Allow navigating back
                 if (isCompleted) setStep(s.id as Step);
               }}
               disabled={!isCompleted && !isActive}
               className={cn(
                 "flex items-center justify-center gap-2 h-10 px-3 md:px-6 rounded-full text-sm font-medium transition-all",
                 (isActive || isCompleted) ? "bg-[#00645A] text-white shadow-sm" : "text-muted-foreground",
                 !isCompleted && !isActive && "opacity-50 cursor-not-allowed"
               )}
             >
               <s.icon className="w-4 h-4" />
               <span className="hidden md:inline">{s.label}</span>
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
        <h3 className="text-3xl font-bold text-[#00645A]">Réservation Confirmée</h3>
        <div className="border p-4 rounded-lg bg-muted/20 w-full max-w-sm">
            <p className="font-medium">{format(formData.date, "EEEE d MMMM yyyy", { locale: fr })}</p>
            <p className="text-xl font-bold my-1">{formData.time}</p>
            <p>{formData.guests} Personnes</p>
            <p className="text-sm text-muted-foreground mt-2">{formData.firstName} {formData.lastName}</p>
        </div>
        <p className="text-muted-foreground max-w-xs mx-auto text-sm">
          Un email de confirmation a été envoyé à {formData.email}.
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
               <div className="flex justify-center border rounded-xl p-4 shadow-sm">
                 <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => {
                      if (date) {
                        setValue("date", date);
                        handleNext("time");
                      }
                    }}
                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                    className="rounded-md border-0"
                    classNames={{
                      day_selected: "bg-[#00645A] text-white hover:bg-[#00645A]/90 focus:bg-[#00645A]",
                      day_today: "bg-accent text-accent-foreground font-bold",
                    }}
                  />
               </div>
               <p className="text-xs text-muted-foreground text-center mt-4">
                 Les offres peuvent varier durant le processus de réservation.
               </p>
             </div>
          )}

          {/* STEP 2: TIME */}
          {step === "time" && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-lg font-bold text-center">Sélectionnez une heure</h3>
              
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">Midi</div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {["12:00", "12:30", "13:00", "13:30"].map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-12 text-base hover:border-[#00645A] hover:text-[#00645A]",
                        formData.time === t && "bg-[#00645A] text-white hover:bg-[#00645A] hover:text-white border-[#00645A]"
                      )}
                      onClick={() => {
                        setValue("time", t);
                        handleNext("guests");
                      }}
                    >
                      {t}
                    </Button>
                  ))}
                </div>

                <div className="text-sm font-medium text-muted-foreground mt-6">Soir</div>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {["19:00", "19:30", "20:00", "20:30", "21:00", "21:30"].map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-12 text-base hover:border-[#00645A] hover:text-[#00645A]",
                        formData.time === t && "bg-[#00645A] text-white hover:bg-[#00645A] hover:text-white border-[#00645A]"
                      )}
                      onClick={() => {
                        setValue("time", t);
                        handleNext("guests");
                      }}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: GUESTS */}
          {step === "guests" && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-lg font-bold text-center">Nombre de personnes</h3>
              
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((num) => (
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
                      handleNext("details");
                    }}
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <div className="flex justify-center">
                 <Button variant="ghost" type="button" className="text-[#00645A] font-medium">
                    Plus de choix +
                 </Button>
              </div>
            </div>
          )}

          {/* STEP 4: DETAILS */}
          {step === "details" && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
               <div className="bg-muted/30 p-4 rounded-lg border text-center mb-6">
                 <h3 className="font-bold text-lg">RÉSERVATION</h3>
                 <div className="flex items-center justify-center gap-2 text-sm mt-1">
                    <span className="font-medium bg-white px-3 py-1 rounded-full border shadow-sm">
                      {formData.guests} Pers.
                    </span>
                    <span className="font-medium bg-white px-3 py-1 rounded-full border shadow-sm">
                       {formData.date && format(formData.date, "eee d MMM", { locale: fr })}
                    </span>
                    <span className="font-medium bg-white px-3 py-1 rounded-full border shadow-sm">
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
