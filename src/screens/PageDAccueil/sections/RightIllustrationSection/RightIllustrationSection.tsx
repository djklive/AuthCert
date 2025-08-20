import {
  ArrowRightIcon,
  ArrowRightLeftIcon,
  BarChart3Icon,
  CalendarDaysIcon,
  CalendarIcon,
  ChevronDownIcon,
  FilterIcon,
  HomeIcon,
  MoreHorizontalIcon,
  PieChartIcon,
  PlayIcon,
  TableIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
//import React from "react";
import { Badge } from "../../../../components/ui/1.badge";
import { Button } from "../../../../components/ui/1.button";
import { Card, CardContent } from "../../../../components/ui/1.card";
import { Separator } from "../../../../components/ui/1.separator";

export const RightIllustrationSection = () => {
  const sidebarSections = [
    {
      title: "ACTIONS",
      items: [
        { icon: HomeIcon, label: "Dashboard", active: true },
        { icon: TableIcon, label: "UserIcon Flow" },
        { icon: CalendarDaysIcon, label: "Content Calender" },
        { icon: ArrowRightLeftIcon, label: "Quick Actions" },
      ],
    },
    {
      title: "PROFILES",
      items: [
        { icon: UserIcon, label: "All Profiles" },
        { icon: FilterIcon, label: "Segments" },
        { icon: ArrowRightLeftIcon, label: "Import/Exports" },
      ],
    },
    {
      title: "DYNAMICS",
      items: [{ icon: BarChart3Icon, label: "Landing Pages" }],
    },
  ];

  const emailMetrics = [
    {
      icon: "/bar.png",
      label: "Opened email",
      value: "3,536",
      percentage: "32.4%",
      color: "set-01-color-4",
    },
    {
      icon: "/bar-1.png",
      label: "Clicked email",
      value: "1,424",
      percentage: "25.1%",
      color: "set-01-color-3",
    },
    {
      icon: "/bar-2.png",
      label: "Unsubscribed",
      value: "153",
      percentage: "1.74%",
      color: "set-01-color-7",
    },
    {
      icon: "/bar-3.png",
      label: "Bounced",
      value: "32",
      percentage: "0.09%",
      color: "set-01-color-6",
    },
  ];

  const campaignData = [
    {
      name: "Sephora Beauty Package - June",
      recipients: "3,386",
      opened: "2,493",
      revenue: "$14,385",
    },
    {
      name: "Gaming Gadgets for Young People",
      recipients: "4,692",
      opened: "4,126",
      revenue: "$12,490",
    },
    {
      name: "New Product Released on May",
      recipients: "8,583",
      opened: "6,583",
      revenue: "$5,205",
    },
    {
      name: "Beauty Package - May",
      recipients: "5,575",
      opened: "4,042",
      revenue: "$3,391",
    },
  ];

  const chartData = [
    { date: "May 19, 2021", height: "h-[69px]", lightHeight: "h-3.5" },
    { date: "May 20, 2021", height: "h-[41px]", lightHeight: "h-2" },
    { date: "May 21, 2021", height: "h-14", lightHeight: "h-[30px]" },
    { date: "May 22, 2021", height: "h-[25px]", lightHeight: "h-3.5" },
    { date: "May 23, 2021", height: "h-[47px]", lightHeight: "h-1" },
  ];

  return (
    <div className="w-full h-auto relative px-4 sm:px-6 lg:px-8">
      <div className="relative h-auto">
        <div className="w-full h-auto">
          <div className="relative w-full h-auto">
            <div className="w-full h-auto rotate-180 blur-[35px] bg-[linear-gradient(90deg,rgba(68,132,255,1)_0%,rgba(68,176,255,1)_23%,rgba(255,68,236,1)_49%,rgba(68,165,255,1)_74%,rgba(242,255,94,1)_100%)] mb-7" />

            <div className="w-full h-auto">
              <Card className="w-full h-auto bg-[#ffffff] rounded-[10px] shadow-[0px_24px_164px_-20px_#23276926] border-0 max-w-6xl mx-auto">
                <CardContent className="p-0 relative">
                  <div className="flex flex-col lg:flex-row">
                    {/* Sidebar */}
                    <div className="w-full lg:w-[160px] h-auto p-4 lg:p-8 lg:pt-[57px] border-b lg:border-b-0 lg:border-r border-gray-200">
                      <div className="space-y-6 lg:space-y-14">
                        {sidebarSections.map((section, sectionIndex) => (
                          <div key={sectionIndex} className="space-y-2 lg:space-y-4">
                            <div className="opacity-40 [font-family:'Inter',Helvetica] font-semibold text-x-10 text-[9.5px] tracking-[2.19px] leading-[16.0px]">
                              {section.title}
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 lg:space-y-4 lg:block">
                              {section.items.map((item, itemIndex) => (
                                <div
                                  key={itemIndex}
                                  className="flex items-center gap-2 lg:gap-3"
                                >
                                  <item.icon className="w-3 h-3 lg:w-4 lg:h-4" />
                                  <span
                                    className={`[font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-[11.7px] tracking-[0] leading-[17.5px] ${
                                      item.active
                                        ? "text-zinc-900"
                                        : "text-x-10 opacity-70"
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 bg-neutral-50 rounded-[0px_0px_10px_10px] lg:rounded-[0px_0px_10px_0px] p-4 lg:p-8 lg:pt-[34px]">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 lg:mb-6 gap-2">
                        <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[11.5px] tracking-[0] leading-[16.4px]">
                          Today&apos;s Report
                        </div>
                        <div className="relative">
                          <div className="w-[75px] h-[17px] rounded-[3.85px] border-[0.48px] border-solid border-[#12203b1a] bg-white flex items-center px-2 gap-2">
                            <CalendarIcon className="w-1.5 h-[7px]" />
                            <span className="opacity-50 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[6.7px] tracking-[0] leading-[10.6px] flex-1">
                              Date range
                            </span>
                            <ChevronDownIcon className="w-[5px] h-[3px]" />
                          </div>
                        </div>
                      </div>

                      {/* Email Metrics */}
                      <Card className="mb-4 lg:mb-6 bg-ffffff rounded-[3.85px] shadow-[0px_0.48px_0px_#12203b17] border-0">
                        <CardContent className="p-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                            {emailMetrics.map((metric, index) => (
                              <div key={index} className="p-3 lg:p-4 relative border-b sm:border-b-0 sm:border-r last:border-b-0 lg:last:border-r-0">
                                <div className="flex items-start gap-2">
                                  <img
                                    className="w-5 h-5 lg:w-7 lg:h-[27px]"
                                    alt="Bar"
                                    src={metric.icon}
                                  />
                                  <div className="flex-1">
                                    <div className="opacity-60 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[7.7px] tracking-[0] leading-[11.5px] mb-1">
                                      {metric.label}
                                    </div>
                                    <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[13.5px] tracking-[0] leading-[18.3px] mb-2">
                                      {metric.value}
                                    </div>
                                    <Badge
                                      className={`bg-${metric.color} bg-opacity-15 text-${metric.color} text-[6.7px] px-2 py-1 rounded-[17.18px] border-0`}
                                    >
                                      {metric.percentage}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Cards Row */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-4 lg:mb-6">
                        {/* Subscribers Card */}
                        <Card className="bg-ffffff rounded-[1.92px] border-[0.58px] border-solid border-[#1e293f26]">
                          <CardContent className="p-0">
                            <div className="p-3 lg:p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="w-[15px] h-[15px] rounded-[7.69px] border-[0.38px] border-solid border-[#1e293f33] flex items-center justify-center">
                                  <UsersIcon className="w-2 h-2" />
                                </div>
                                <div>
                                  <div className="font-bold-18px font-[number:var(--bold-18px-font-weight)] text-x-10 text-[length:var(--bold-18px-font-size)] tracking-[var(--bold-18px-letter-spacing)] leading-[var(--bold-18px-line-height)] [font-style:var(--bold-18px-font-style)]">
                                    Subscribers
                                  </div>
                                  <div className="opacity-70 [font-family:'Plus_Jakarta_Sans',Helvetica] font-normal text-x-10 text-sm tracking-[0] leading-5">
                                    The growth rate of your subscribers
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[10.8px] tracking-[0] leading-[14.6px] mb-2">
                                    14,857
                                  </div>
                                  <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[6.1px] tracking-[0] leading-[10.8px] mb-4">
                                    Unique Subscribers
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="opacity-70 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[6.1px] tracking-[0] leading-[9.2px]">
                                      New Email Subscribers
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[6.1px] tracking-[0] leading-[10.8px]">
                                        2,958
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <TrendingUpIcon className="w-1.5 h-1.5" />
                                        <span className="text-set-01-color-4 text-[5.4px] leading-[8.5px] [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold tracking-[0]">
                                          14%
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="opacity-70 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[6.1px] tracking-[0] leading-[9.2px]">
                                      New SMS Subscribers
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[6.1px] tracking-[0] leading-[10.8px]">
                                        614
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <TrendingDownIcon className="w-0.5 h-0.5" />
                                        <span className="text-set-01-color-6 text-[2.1px] leading-[3.2px] [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold tracking-[0]">
                                          14%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-normal text-x-10 text-[5.4px] tracking-[0] leading-[5.4px]">
                                  <span className="font-medium text-[#1e293f] leading-[8.5px]">
                                    Want more subscribers? Grow email list with{" "}
                                  </span>
                                  <span className="font-medium text-[#3e88f6] leading-[8.5px]">
                                    form
                                  </span>
                                  <span className="font-medium text-[#1e293f] leading-[8.5px]">
                                    {" "}
                                    or{" "}
                                  </span>
                                  <span className="font-medium text-[#3e88f6] leading-[8.5px]">
                                    landing page
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Campaign Reports Card */}
                        <Card className="bg-ffffff rounded-[1.92px] border-[0.58px] border-solid border-[#1e293f26]">
                          <CardContent className="p-0">
                            <div className="p-3 lg:p-4">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-[15px] h-[15px] rounded-[7.69px] border-[0.38px] border-solid border-[#1e293f33] flex items-center justify-center">
                                    <BarChart3Icon className="w-2 h-2" />
                                  </div>
                                  <div>
                                    <div className="font-bold-18px font-[number:var(--bold-18px-font-weight)] text-x-10 text-[length:var(--bold-18px-font-size)] tracking-[var(--bold-18px-letter-spacing)] leading-[var(--bold-18px-line-height)] [font-style:var(--bold-18px-font-style)]">
                                      Campaign Reports
                                    </div>
                                    <div className="opacity-70 [font-family:'Plus_Jakarta_Sans',Helvetica] font-normal text-x-10 text-sm tracking-[0] leading-5">
                                      How your campaigns are performing
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  className="h-auto p-[6.15px] rounded-[1.92px] text-x-3f-8-8f-7"
                                >
                                  <span className="font-bold-13px font-[number:var(--bold-13px-font-weight)] text-[length:var(--bold-13px-font-size)] leading-[var(--bold-13px-line-height)] tracking-[var(--bold-13px-letter-spacing)] [font-style:var(--bold-13px-font-style)]">
                                    Check All Campaigns
                                  </span>
                                  <ArrowRightIcon className="w-[6.92px] h-[6.92px] ml-1" />
                                </Button>
                              </div>

                              {/* TableIcon Header */}
                              <div className="hidden sm:grid grid-cols-4 gap-4 mb-2 pb-2 border-b border-[#1e293f26]">
                                <span className="opacity-60 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[5.4px] tracking-[0] leading-[8.5px]">
                                  Name
                                </span>
                                <span className="opacity-60 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[5.4px] tracking-[0] leading-[8.5px]">
                                  Receipent
                                </span>
                                <span className="opacity-60 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[5.4px] tracking-[0] leading-[8.5px]">
                                  Opened
                                </span>
                                <span className="opacity-60 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[5.4px] tracking-[0] leading-[8.5px]">
                                  Revenue
                                </span>
                              </div>

                              {/* TableIcon Rows */}
                              <div className="space-y-2">
                                {campaignData.map((campaign, index) => (
                                  <div
                                    key={index}
                                    className="flex flex-col sm:grid sm:grid-cols-4 gap-2 sm:gap-4 py-2 border-b border-[#1e293f26] last:border-b-0"
                                  >
                                    <div className="sm:contents">
                                      <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[6.1px] tracking-[0] leading-[9.2px]">
                                        <span className="sm:hidden font-semibold">Name: </span>{campaign.name}
                                      </span>
                                      <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[6.1px] tracking-[0] leading-[9.2px]">
                                        <span className="sm:hidden font-semibold">Recipients: </span>{campaign.recipients}
                                      </span>
                                      <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[6.1px] tracking-[0] leading-[9.2px]">
                                        <span className="sm:hidden font-semibold">Opened: </span>{campaign.opened}
                                      </span>
                                      <div className="flex justify-between items-center">
                                        <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[6.1px] tracking-[0] leading-[9.2px]">
                                          <span className="sm:hidden font-semibold">Revenue: </span>{campaign.revenue}
                                        </span>
                                        <MoreHorizontalIcon className="w-[9px] h-[9px]" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Sales Report Card */}
                      <Card className="bg-ffffff rounded-[1.92px] border-[0.58px] border-solid border-[#1e293f26]">
                        <CardContent className="p-0">
                          <div className="p-3 lg:p-4">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-2">
                                <div className="w-[15px] h-[15px] rounded-[7.67px] border-[0.38px] border-solid border-[#1e293f33] flex items-center justify-center">
                                  <PieChartIcon className="w-2 h-2" />
                                </div>
                                <div>
                                  <div className="font-bold-18px font-[number:var(--bold-18px-font-weight)] text-x-10 text-[length:var(--bold-18px-font-size)] tracking-[var(--bold-18px-letter-spacing)] leading-[var(--bold-18px-line-height)] [font-style:var(--bold-18px-font-style)]">
                                    Sales Report
                                  </div>
                                  <div className="opacity-70 [font-family:'Plus_Jakarta_Sans',Helvetica] font-normal text-x-10 text-sm tracking-[0] leading-5">
                                    How you are growing your revenue
                                  </div>
                                </div>
                              </div>
                              <div className="relative">
                                <div className="w-[70px] h-3.5 rounded-[3.07px] border-[0.38px] border-solid border-[#12203b29] bg-white flex items-center px-2 gap-2">
                                  <CalendarIcon className="w-[5px] h-[5px]" />
                                  <span className="opacity-60 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[5.4px] tracking-[0] leading-[8.4px] flex-1">
                                    May 19 - May 25
                                  </span>
                                  <ChevronDownIcon className="w-1 h-0.5" />
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col lg:flex-row">
                              {/* Left Stats */}
                              <div className="w-full lg:w-[185px] lg:pr-4 mb-4 lg:mb-0">
                                <div className="space-y-6">
                                  <div className="grid grid-cols-2 gap-4 lg:flex lg:justify-between">
                                    <div>
                                      <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[6.1px] tracking-[0] leading-[10.7px] mb-1">
                                        Total Revenue
                                      </div>
                                      <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#2563eb] text-[10.7px] tracking-[0] leading-[14.6px]">
                                        $131,948
                                      </div>
                                    </div>
                                    <div>
                                      <div className="opacity-70 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[6.1px] tracking-[0] leading-[9.2px] mb-1">
                                        Total orders
                                      </div>
                                      <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[10.7px] tracking-[0] leading-[14.6px]">
                                        3,814
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 lg:flex lg:justify-between">
                                    <div>
                                      <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[6.1px] tracking-[0] leading-[10.7px] mb-1">
                                        From Campaigns
                                      </div>
                                      <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#2563eb] text-[10.7px] tracking-[0] leading-[14.6px]">
                                        $123,386
                                      </div>
                                    </div>
                                    <div>
                                      <div className="opacity-70 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[6.1px] tracking-[0] leading-[9.2px] mb-1">
                                        Orders
                                      </div>
                                      <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[10.7px] tracking-[0] leading-[14.6px]">
                                        3,511
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 lg:flex lg:justify-between">
                                    <div>
                                      <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[6.1px] tracking-[0] leading-[10.7px] mb-1">
                                        From Automation
                                      </div>
                                      <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#2563eb] text-[10.7px] tracking-[0] leading-[14.6px]">
                                        $9,157
                                      </div>
                                    </div>
                                    <div>
                                      <div className="opacity-70 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10 text-[6.1px] tracking-[0] leading-[9.2px] mb-1">
                                        Orders
                                      </div>
                                      <div className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-x-10 text-[10.7px] tracking-[0] leading-[14.6px]">
                                        403
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="lg:hidden">
                                  <Separator className="my-4" />
                                </div>
                                <Separator
                                  orientation="vertical"
                                  className="hidden lg:block absolute right-0 top-0 h-full"
                                />
                              </div>

                              {/* Chart Area */}
                              <div className="flex-1 lg:pl-4 relative">
                                {/* Toggle Buttons */}
                                <div className="flex mb-4">
                                  <Button
                                    variant="secondary"
                                    className="h-auto px-2 py-1 rounded-l-[1.92px] rounded-r-none border-[0.38px] border-solid border-[#12203b14] text-[5.4px] bg-[#7d94b21a]"
                                  >
                                    Revenue
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="h-auto px-2 py-1 rounded-r-[1.92px] rounded-l-none border-[0.38px] border-solid border-[#12203b14] text-[5.4px] bg-ffffff"
                                  >
                                    Orders
                                  </Button>
                                </div>

                                {/* Legend */}
                                <div className="flex gap-4 mb-4 text-[5.4px]">
                                  <div className="flex items-center gap-1">
                                    <div className="w-[3px] h-[3px] bg-set-01-color-4 rounded-full" />
                                    <span className="opacity-60 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10">
                                      Campaigns
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className="w-[3px] h-[3px] bg-set-01-color-5 rounded-full" />
                                    <span className="opacity-60 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-x-10">
                                      Automations
                                    </span>
                                  </div>
                                </div>

                                {/* Y-axis labels */}
                                <div className="absolute left-0 top-16 space-y-5 text-right text-[5.4px] opacity-50">
                                  <div>50,000</div>
                                  <div>20,000</div>
                                  <div>10,000</div>
                                  <div>0</div>
                                </div>

                                {/* Chart bars */}
                                <div className="flex items-end justify-center gap-2 lg:gap-4 h-[82px] ml-4 lg:ml-8 overflow-x-auto">
                                  {chartData.map((data, index) => (
                                    <div
                                      key={index}
                                      className="flex flex-col items-center min-w-[40px]"
                                    >
                                      <div className="flex">
                                        <div
                                          className={`w-[15px] lg:w-[21px] ${data.height} bg-[#60a5fa]`}
                                        />
                                        <div
                                          className={`w-[15px] lg:w-[21px] ${data.lightHeight} bg-blue-100 self-end`}
                                        />
                                      </div>
                                      <div className="mt-2 text-[4px] lg:text-[5.4px] opacity-50 [font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-center whitespace-nowrap">
                                        {data.date}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Grid lines */}
                                <div className="absolute inset-0 ml-4 lg:ml-8">
                                  <div className="h-full flex flex-col justify-between">
                                    <div className="border-t border-[#1e293f26]" />
                                    <div className="border-t border-[#1e293f26]" />
                                    <div
                                      className="border-t border-[#1e
293f26]"
                                    />
                                    <div className="border-t border-[#1e293f26]" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Window Controls */}
                  <div className="absolute top-[11px] left-[17px] flex gap-2">
                    <div className="w-2.5 h-2.5 bg-[#ff4343] rounded-[5px]" />
                    <div className="w-2.5 h-2.5 bg-[#fcb141] rounded-[5px]" />
                    <div className="w-2.5 h-2.5 bg-[#65d71f] rounded-[5px]" />
                  </div>

                  {/* Top Border Line */}
                  <Separator className="absolute top-[33px] left-px right-px" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* PlayIcon Button Overlay */}
        <div className="absolute top-[100px] lg:top-[149px] left-1/2 transform -translate-x-1/2 w-[150px] h-[150px] lg:w-[222px] lg:h-[222px] bg-[#ffffff] rounded-full blur-[80px]">
          <div className="relative w-[80px] h-[80px] lg:w-[120px] lg:h-[120px] top-[35px] left-[35px] lg:top-[51px] lg:left-[51px] bg-[#ffffffb2] rounded-full shadow-[0px_24px_154px_#00000040] backdrop-blur-[7px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(7px)_brightness(100%)] flex items-center justify-center">
            <PlayIcon className="w-[20px] h-[20px] lg:w-[33px] lg:h-[33px]" />
          </div>
        </div>
      </div>
    </div>
  );
};
