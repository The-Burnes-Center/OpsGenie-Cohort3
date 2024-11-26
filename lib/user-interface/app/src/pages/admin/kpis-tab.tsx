import {
  Box,
  SpaceBetween,
  Table,
  DateRangePicker,
  Pagination,
  Button,
  Header,
  Modal,
  Select,
  Spinner,
  FormField,
  Textarea,
  TextContent,
  DateRangePickerProps,
  BarChart,
  Link,
  Icon,
  BarChartProps,
} from "@cloudscape-design/components";
import { I18nProvider } from '@cloudscape-design/components/i18n';
import messages from '@cloudscape-design/components/i18n/messages/all.all';
import { DateTime } from "luxon";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import RouterButton from "../../components/wrappers/router-button";
import { RagDocumentType } from "../../common/types";
import { TableEmptyState } from "../../components/table-empty-state";
import { ApiClient } from "../../common/api-client/api-client";
import { AppContext } from "../../common/app-context";
import { PropertyFilterI18nStrings } from "../../common/i18n/property-filter-i18n-strings";
// import {I18nStrings} from 
// import { I18nProvider } from '@cloudscape-design/components/i18n';
// import {DatePickerProps.I18nStrings} from ;
import { getColumnDefinition } from "./columns";
// import { I18nProviderProps } from "@cloudscape-design/components/i18n";
import { Utils } from "../../common/utils";
import { useCollection } from "@cloudscape-design/collection-hooks";
import React from 'react';
import { useNotifications } from "../../components/notif-manager";
import {KPIMetrics} from '../../common/constants'
export interface KPIsTabProps {
  updateSelectedMetrics: React.Dispatch<any>;
}


export default function KPIsTab(props: KPIsTabProps) {
  const appContext = useContext(AppContext);
  const apiClient = new ApiClient(appContext);
  const [loading, setLoading] = useState(true); // if the page is loading or not
  const [currentPageIndex, setCurrentPageIndex] = useState(1); // the page index
  const [pages, setPages] = useState<any[]>([]);
  const [chartData, setChartData] = useState([]); // daily logins data
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showModalDelete, setShowModalDelete] = useState(false); // hook for the 'Do you want to delete?' pop-up
  const needsRefresh = useRef<boolean>(false);

  const [showTextModal, setShowTextModal] = useState(false);
  const [modalText, setModalText] = useState("");

  const FLAG_RESPONSE = 20; // chatbot interactions with response times longer than this will be flagged
  
  // Function to open the modal with full text
  const handleShowMore = (text) => {
    setModalText(text);
    setShowTextModal(true);
  };

  const [
    selectedOption,
    setSelectedOption
  ] = React.useState({label : "Chatbot Uses", value: "chatbot-uses", disabled: false});
  const [value, setValue] = React.useState<DateRangePickerProps.AbsoluteValue>({
    type: "absolute",
    startDate: (new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 7)).toISOString(),
    endDate: (new Date()).toISOString()
  });

  const { addNotification, removeNotification } = useNotifications();

  const [sortingColumn, setSortingColumn] = useState({ sortingField: "Timestamp" });
  const [isDescending, setIsDescending] = useState(true);

  const onSortingChange = ({ detail }) => {
    setSortingColumn(detail.sortingColumn);
    setIsDescending(detail.isDescending);
  };

  // sorts table items by the sorting column
  const currentPageItems = pages[0]?.Items || [];
  const sortedItems = [...currentPageItems].sort((a, b) => {
    const { sortingField } = sortingColumn;
    const direction = isDescending ? 1 : -1;

    if (a[sortingField] < b[sortingField]) return -1 * direction;
    if (a[sortingField] > b[sortingField]) return 1 * direction;
    return 0;
  });
  
  const { items, collectionProps, paginationProps, } = useCollection(pages, {
    filtering: {
      empty: (
        <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
          <SpaceBetween size="m">
            <b>No metrics</b>
          </SpaceBetween>
        </Box>
      ),
    },
    pagination: { pageSize: 5 },
    //sorting: { defaultState: sortingState },
    selection: {},
  });



  const getKPI = useCallback(
    async (params: { pageIndex?, nextPageToken?}) => {
      setLoading(true);
      try {
        const result = await apiClient.metrics.getChatbotUse(value.startDate, value.endDate, params.nextPageToken)

        // console.log(result);
        setPages((current) => {
          if (needsRefresh.current) {
            needsRefresh.current = false;
            return [result];
          }
          if (typeof params.pageIndex !== "undefined") {
            current[params.pageIndex - 1] = result;
            return [...current];
          } else {
            return [...current, result];
          }
        });
      } catch (error) {
        console.error(Utils.getErrorMessage(error));
      }
      setLoading(false);
    },
    [appContext, selectedOption, value, needsRefresh]
  );

  const getDailyLogins = useCallback(
    async() => {
      setLoading(true);
      try {
        const data = await apiClient.metrics.getDailyLogins(value.startDate.split("T")[0], value.endDate.split("T")[0]);
        setChartData(data);
        // console.log("updated chart data, new date", value);
        // console.log("new chart data:", chartData);
      } catch (e) {
        setChartData([]);
      }
      setLoading(false)
    },
    [appContext, selectedOption, value, needsRefresh, apiClient]
  );
  

  useEffect(() => {
    setCurrentPageIndex(1);    
    setSelectedItems([]);
    setChartData([]); // lesson learnt the hard way but this must be here
    getDailyLogins();
    if (needsRefresh.current) {
      getKPI({ pageIndex: 1 });
    } else { 
      getKPI({ pageIndex: currentPageIndex }); 
    }
  }, [getKPI]);

  // useEffect(() => {
  //   if (needsRefresh.current) {
  //     getDailyLogins(); 
  //   }
  // }, [getDailyLogins]);

  const onNextPageClick = async () => {
    // console.log(pages);
    const continuationToken = pages[currentPageIndex - 1]?.NextPageToken;
    // console.log("next page", currentPageIndex)
    // console.log(pages);
    if (continuationToken) {
      if (pages.length <= currentPageIndex || needsRefresh.current) {
        await getKPI({ nextPageToken: continuationToken });
      }
      setCurrentPageIndex((current) => Math.min(pages.length + 1, current + 1));
    }
  };


  const onPreviousPageClick = async () => {
    // console.log("prev page", currentPageIndex)
    // console.log(pages);
    setCurrentPageIndex((current) =>
      Math.max(1, Math.min(pages.length - 1, current - 1))
    );
  };

  const refreshPage = async () => {
    // console.log(pages[Math.min(pages.length - 1, currentPageIndex - 1)]?.Contents!)
    if (currentPageIndex <= 1) {
      await getKPI({ pageIndex: currentPageIndex });
    } else {
      const continuationToken = pages[currentPageIndex - 2]?.NextPageToken!;
      await getKPI({ pageIndex: currentPageIndex, nextPageToken: continuationToken });
    }
  };

  const columnDefinitionsAHT = [
    {
      id: "time-stamp",
      header: "Timestamp",
      cell: (item) =>
        DateTime.fromISO(new Date(item.CreatedAt).toISOString()).toLocaleString(
          DateTime.DATETIME_SHORT
        ),
      isRowHeader: true,
    },
    {
      id: "response-time",
      header: "Response Time",
      cell: (item) => item.ResponseTime,
      isRowHeader: true,
    },
    {
      id: "hold-time",
      header: "Hold Time",
      cell: (item) => item.HoldTime,
      isRowHeader: true,
    },
    {
      id: "holds",
      header: "Holds",
      cell: (item) => item.Holds,
      isRowHeader: true,
    },
  ]

  /**
   * id: ID for column in the table
   * header: header text for that column
   * cell: item is a piece of data and for item.x, it's getting the "x" field of the data item
   * 
   * BotMessage and UserPrompt wrap and user has to select "Show More" if they're longer than 50 characters
   */
  const columnDefinitionsInteractions = [
    {
      id: "timestamp",
      header: "Timestamp",
      cell: (item) => DateTime.fromISO(new Date(item.Timestamp).toISOString()).toLocaleString(
               DateTime.DATETIME_SHORT
             ),
      isRowHeader: true,
      sortingField: "Timestamp",
    },
    {
      id: "responseTime",
      header: "Response Time",
      cell: (item) => (
        <>{item.ResponseTime} {item.ResponseTime >= FLAG_RESPONSE && <Icon name="flag" size="normal" variant="error" />}</>
      ),
      isRowHeader: true,
      sortingField: "ResponseTime",
    },
    {
      id: "username",
      header: "Username",
      cell: (item) => item.Username,
      isRowHeader: true,
      sortingField: "Username",
    },
    {
      id: "UserPrompt",
      header: "User Prompt",
      cell: (item) => (
        <Box>
          <TextContent>{item.UserPrompt.slice(0, 90)}{item.UserPrompt.length > 90 && "..."}</TextContent>
          {item.UserPrompt.length > 75 && (
            <Link
            onFollow={() => handleShowMore(item.UserPrompt)}>
            Show More
          </Link>

          )}
        </Box>
      ),
      isRowHeader: true,
    },
    {
      id: "BotMessage",
      header: "Bot Message",
      cell: (item) => (
        <Box>
          <TextContent>{item.BotMessage.slice(0, 90)}{item.BotMessage.length > 90 && "..."}</TextContent>
          {item.BotMessage.length > 75 && (
            <Link
            onFollow={() => handleShowMore(item.BotMessage)}>
            Show More
          </Link>
          )}
        </Box>
      ),
      isRowHeader: true,
    },
  ];

  const deleteSelectedChatbotUses = async () => {
    if (!appContext) return;

    setLoading(true);
    setShowModalDelete(false);
    const apiClient = new ApiClient(appContext);
    await Promise.all(
      selectedItems.map((s) => apiClient.metrics.deleteChatbotUses(s.Timestamp))
    );
    await getKPI({ pageIndex: currentPageIndex });
    setSelectedItems([])
    setLoading(false);
  };



  return (
    <>
      <Modal
      onDismiss={() => setShowModalDelete(false)}
      visible={showModalDelete}
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            {" "}
            <Button variant="link" onClick={() => setShowModalDelete(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={deleteSelectedChatbotUses}>
              Ok
            </Button>
          </SpaceBetween>{" "}
        </Box>
      }
      header={"Delete metric" + (selectedItems.length > 1 ? "s" : "")}
    >
      Do you want to delete{" "}
      {selectedItems.length == 1
        ? `Metrics ${selectedItems[0].Timestamp!}?`
        : `${selectedItems.length} Metric?`}
    </Modal>
      <I18nProvider locale="en" messages={[messages]}>
        {selectedOption.value === 'daily-users' && 
        <>
          <Header
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <DateRangePicker
                    onChange={({ detail }) => {
                      if ('startDate' in detail.value && 'endDate' in detail.value) {
                        setValue({
                          type: "absolute",
                          startDate: new Date(detail.value.startDate).toISOString(),
                          endDate: new Date(detail.value.endDate).toISOString(),
                        });

                      } else {
                          console.log("not an AbsoluteValue");
                      }
                    }}
                    value={{
                      ...value,
                      startDate: value.startDate.split("T")[0],
                      endDate: value.endDate.split("T")[0],
                    } as DateRangePickerProps.AbsoluteValue}
                    relativeOptions={[
                      {
                        key: "previous-5-minutes",
                        amount: 5,
                        unit: "minute",
                        type: "relative"
                      },
                      {
                        key: "previous-30-minutes",
                        amount: 30,
                        unit: "minute",
                        type: "relative"
                      },
                      {
                        key: "previous-1-hour",
                        amount: 1,
                        unit: "hour",
                        type: "relative"
                      },
                      {
                        key: "previous-6-hours",
                        amount: 6,
                        unit: "hour",
                        type: "relative"
                      }
                    ]}
                    
                    isValidRange={range => {
                      if (range.type === "absolute") {
                        const [
                          startDateWithoutTime
                        ] = range.startDate.split("T");
                        const [
                          endDateWithoutTime
                        ] = range.endDate.split("T");
                        if (
                          !startDateWithoutTime ||
                          !endDateWithoutTime
                        ) {
                          return {
                            valid: false,
                            errorMessage:
                              "The selected date range is incomplete. Select a start and end date for the date range."
                          };
                        }
                        if (
                          +new Date(range.startDate) - +new Date(range.endDate) > 0
                        ) {
                          return {
                            valid: false,
                            errorMessage:
                              "The selected date range is invalid. The start date must be before the end date."
                          };
                        }
                      }
                      return { valid: true };
                    }}
                    i18nStrings={{}}
                    placeholder="Filter by a date and time range"
                    showClearButton={false}
                    timeInputFormat="hh:mm:ss"
                    rangeSelectorMode="absolute-only"
                    
                  />
                  {/* <FormField label="Filter Topic"> */}
                    <Select
                      selectedOption={selectedOption}
                      onChange={({ detail }) => {
  
                        // console.log(detail);
                        needsRefresh.current = true;
                        setSelectedOption({ label: detail.selectedOption.label!, value: detail.selectedOption.value, disabled: false });
                        // setTopic(detail.selectedOption.value); 
                      }}
                      
                      options={[...KPIMetrics]}
                    />
                  {/* </FormField> */}

                  <Button iconName="refresh" onClick={refreshPage} ariaLabel="Refresh page"/>
                  <Button 
                    variant="primary"
                    onClick={() => {
                      apiClient.metrics.getDailyUses(value.startDate, value.endDate);
                      //console.log("idk if they want downloading")
                    }}
                  >
                    Download
                  </Button>
                </SpaceBetween>
              }
              description="Please expect a delay for your changes to be reflected. Press the refresh button to see the latest changes."
            >
              {"KPIs"}
            </Header>
          
            <BarChart
              series={chartData.length > 0 ?
                      [{title: "Users",
                        type: "bar",
                        data: chartData
                      }]
                      : [] // goes to empty prop in this case
                    }
              ariaLabel="Bar chart of the tool's daily users"
              empty={<Box textAlign="center" color="inherit">
                      <b>No data available</b>
                      <Box variant="p" color="inherit">
                        There is no data available in the selected timeframe
                      </Box>
                    </Box>}
            />
        </>}

        {selectedOption.value === 'chatbot-uses' &&
        <Table
          {...collectionProps}
          loading={loading}
          loadingText={`Loading Metrics`}
          columnDefinitions={columnDefinitionsInteractions}
          selectionType="multi"
          onSelectionChange={({ detail }) => {
            // console.log(detail);
            // needsRefresh.current = true;
            props.updateSelectedMetrics(detail.selectedItems[0])
            setSelectedItems(detail.selectedItems);
          }}
          // onSortingChange={({ detail }) => {handleSortingChange(detail.sortingColumn.sortingField)
          //   // why is it one update behind????
          //   console.log("sorting field is now: " + sortingState.sortingColumn.sortingField)
          // }}

          onSortingChange={onSortingChange} // Attach the onSortingChange handler
          sortingColumn={sortingColumn} // Pass the current sorting state to the Table
          sortingDescending={isDescending}
          selectedItems={selectedItems}
          //items={pages[Math.min(pages.length - 1, currentPageIndex - 1)]?.Items!}
          items={sortedItems}
          //pagination={paginationProps}
          trackBy="Timestamp"
          header={
            <Header
              actions={
                <SpaceBetween direction="horizontal" size="xs">
                  <DateRangePicker
                    onChange={({ detail }) => {
                      if ('startDate' in detail.value && 'endDate' in detail.value) {
                        setValue({
                          type: "absolute",
                          startDate: new Date(detail.value.startDate).toISOString(),
                          endDate: new Date(detail.value.endDate).toISOString(),
                        });
                      } else {
                          console.log("not an AbsoluteValue");
                      }
                    }}
                    value={value as DateRangePickerProps.AbsoluteValue}
                    relativeOptions={[
                      {
                        key: "previous-5-minutes",
                        amount: 5,
                        unit: "minute",
                        type: "relative"
                      },
                      {
                        key: "previous-30-minutes",
                        amount: 30,
                        unit: "minute",
                        type: "relative"
                      },
                      {
                        key: "previous-1-hour",
                        amount: 1,
                        unit: "hour",
                        type: "relative"
                      },
                      {
                        key: "previous-6-hours",
                        amount: 6,
                        unit: "hour",
                        type: "relative"
                      }
                    ]}
                    
                    isValidRange={range => {
                      if (range.type === "absolute") {
                        const [
                          startDateWithoutTime
                        ] = range.startDate.split("T");
                        const [
                          endDateWithoutTime
                        ] = range.endDate.split("T");
                        if (
                          !startDateWithoutTime ||
                          !endDateWithoutTime
                        ) {
                          return {
                            valid: false,
                            errorMessage:
                              "The selected date range is incomplete. Select a start and end date for the date range."
                          };
                        }
                        if (
                          +new Date(range.startDate) - +new Date(range.endDate) > 0
                        ) {
                          return {
                            valid: false,
                            errorMessage:
                              "The selected date range is invalid. The start date must be before the end date."
                          };
                        }
                      }
                      return { valid: true };
                    }}
                    i18nStrings={{}}
                    placeholder="Filter by a date and time range"
                    showClearButton={false}
                    timeInputFormat="hh:mm:ss"
                    rangeSelectorMode="absolute-only"
                    
                  />
                  {/* <FormField label="Filter Topic"> */}
                    <Select
                      selectedOption={selectedOption}
                      onChange={({ detail }) => {
                        // console.log(detail);
                        needsRefresh.current = true;
                        setSelectedOption({ label: detail.selectedOption.label!, value: detail.selectedOption.value, disabled: false });
                        // setTopic(detail.selectedOption.value); 
                      }}
                      
                      options={[...KPIMetrics]}
                    />
                  {/* </FormField> */}

                  <Button iconName="refresh" onClick={refreshPage} ariaLabel="Refresh page"/>
                  <Button 
                    variant="primary"
                    onClick={async () => {
                      try {
                        await apiClient.metrics.downloadChatbotUses(value.startDate, value.endDate);
                        const id = addNotification("success", "Your file has been downloaded.")
                        Utils.delay(3000).then(() => removeNotification(id));
                      } catch (e) {
                        const id = addNotification("error", "There was an error downloading the file.");
                        Utils.delay(3000).then(() => removeNotification(id));
                      }
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    variant="primary"
                    disabled={selectedItems.length == 0}
                    onClick={() => {
                      if (selectedItems.length > 0) setShowModalDelete(true);
                    }}
                    data-testid="submit">
                    Delete
                  </Button>
                </SpaceBetween>
              }
              description="Please expect a delay for your changes to be reflected. Press the refresh button to see the latest changes."
            >
              {"KPIs"}
            </Header>
          }
          empty={
            <Box textAlign="center">No more metrics</Box>
          }
          pagination={
            pages.length === 0 ? null : (
              <Pagination
                openEnd={true}
                pagesCount={pages.length}
                currentPageIndex={currentPageIndex}
                onNextPageClick={onNextPageClick}
                onPreviousPageClick={onPreviousPageClick}
              />
            )
          }
          
        />
        
}         <Modal
      onDismiss={() => setShowTextModal(false)}
      visible={showTextModal}
      header="Full Text"
      footer={
        <Box float="right">
          <Button onClick={() => setShowTextModal(false)}>Close</Button>
        </Box>
      }
    >
      <TextContent>{modalText}</TextContent>
    </Modal>
      </I18nProvider>
    </>


  );
}

